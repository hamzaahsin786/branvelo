"""Menu import (staff): spreadsheet and menu-photo imports.

Both sources feed one review-first flow:

1. A preview endpoint turns the upload into normalized rows (name, price,
   description, category, availability) with per-row errors/warnings.
   Nothing is written to the menu at this stage.
2. The admin edits the rows in the browser and confirms.
3. The commit endpoint re-validates and creates categories + items in a
   single transaction, skipping items that are already on the menu.

Photo reading uses the Gemini vision API (free tier) when the server has
GEMINI_API_KEY set; without a key the endpoint explains itself and the
spreadsheet import keeps working.
"""
import base64
import csv
import io
import json
import os
import re
import urllib.error
import urllib.request

from django.db import transaction
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffWriter
from catalog.models import Category, MenuItem

MAX_SHEET_BYTES = 2 * 1024 * 1024
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGES = 4
MAX_ROWS = 1000
DEFAULT_CATEGORY = "General"

_HEADER_ALIASES = {
    "name": {"name", "item", "itemname", "menuitem", "title", "product", "dish", "items"},
    "price": {"price", "pricepkr", "rate", "cost", "amount"},
    "description": {"description", "desc", "details", "detail", "ingredients"},
    "category": {"category", "categories", "section", "type", "group"},
    "available": {"available", "availability", "active", "instock", "status"},
}

_GEMINI_PROMPT = (
    "You are reading photos of a restaurant menu. Extract EVERY sellable "
    "item and return only JSON in exactly this shape: "
    '{"items": [{"name": "...", "price": 550, "description": "...", '
    '"category": "..."}]}. Rules: price is a plain number in PKR, no '
    "commas, no currency words; if one item has size or variant prices, "
    "emit one entry per variant with the variant added to the name, e.g. "
    '"Zinger Burger (Large)"; category is the section heading printed '
    "above the item (Burgers, BBQ, Deals and so on), or \"General\" when "
    "there is no heading; description only when the menu prints one, "
    "otherwise an empty string; ignore phone numbers, addresses, slogans "
    "and timings; read Urdu and English text equally well."
)


# ---------------------------------------------------------------------------
# Shared row normalization
# ---------------------------------------------------------------------------

def _parse_price(raw):
    """Return (value, error). Accepts numbers and messy strings like
    'Rs 550', '550/-' or '1,250'."""
    if raw is None:
        return None, "Missing price"
    if isinstance(raw, bool):
        return None, "Price is not a number"
    if isinstance(raw, (int, float)):
        value = int(round(raw))
        return (value, None) if value >= 0 else (None, "Price is negative")
    text = str(raw).strip()
    if not text:
        return None, "Missing price"
    cleaned = re.sub(r"(?i)rs\.?|pkr", "", text)
    cleaned = cleaned.replace(",", "").replace("/-", "").strip()
    try:
        value = int(round(float(cleaned)))
    except ValueError:
        return None, f"Price '{text}' is not a number"
    if value < 0:
        return None, "Price is negative"
    return value, None


def _parse_available(raw):
    if raw is None:
        return True
    if isinstance(raw, bool):
        return raw
    text = str(raw).strip().lower()
    if text in {"no", "false", "0", "out of stock", "inactive", "unavailable"}:
        return False
    return True


def _menu_maps():
    """Existing catalog lookups used for duplicate + new-category checks."""
    cat_names = {c.name.lower(): c.name for c in Category.objects.all()}
    item_keys = {
        (item.category.name.lower(), item.name.lower())
        for item in MenuItem.objects.select_related("category")
    }
    return cat_names, item_keys


def _normalize_rows(raw_rows):
    """raw_rows: dicts with name/price_raw/description/category/
    available_raw (+ row_no). Returns (rows, new_categories)."""
    cat_names, item_keys = _menu_maps()
    seen_in_file = set()
    new_categories = []
    rows = []
    for raw in raw_rows:
        errors, warnings = [], []
        name = str(raw.get("name") or "").strip()
        if not name:
            errors.append("Missing name")
        if len(name) > 120:
            name = name[:120]
            warnings.append("Name shortened to 120 characters")
        price, price_error = _parse_price(raw.get("price_raw"))
        if price_error:
            errors.append(price_error)
        elif price == 0:
            warnings.append("Price is 0 - please check it")
        category = str(raw.get("category") or "").strip() or DEFAULT_CATEGORY
        if len(category) > 80:
            category = category[:80]
        key = (category.lower(), name.lower())
        duplicate = bool(name) and (key in item_keys or key in seen_in_file)
        if duplicate:
            warnings.append("Already on the menu - it will be skipped")
        if name:
            seen_in_file.add(key)
        if category.lower() not in cat_names and category not in new_categories:
            new_categories.append(category)
        rows.append(
            {
                "row_no": raw.get("row_no"),
                "name": name,
                "price_pkr": price,
                "description": str(raw.get("description") or "").strip(),
                "category": category,
                "is_available": _parse_available(raw.get("available_raw")),
                "errors": errors,
                "warnings": warnings,
                "duplicate": duplicate,
                "category_is_new": category.lower() not in cat_names,
                "include": not errors and not duplicate,
            }
        )
    return rows, new_categories


# ---------------------------------------------------------------------------
# Spreadsheet reading
# ---------------------------------------------------------------------------

def _sheet_rows(upload):
    """Read an uploaded .csv/.xlsx into raw row dicts. Returns
    (raw_rows, warnings) or raises ValueError with a plain message."""
    data = upload.read()
    name = (upload.name or "").lower()
    if name.endswith(".csv"):
        grid = _read_csv(data)
    elif name.endswith(".xlsx"):
        grid = _read_xlsx(data)
    else:
        raise ValueError("Only .csv and .xlsx files are supported.")
    grid = [row for row in grid if any(str(c).strip() for c in row if c is not None)]
    if not grid:
        raise ValueError("The sheet is empty.")
    warnings = []
    columns, first_data_idx = _detect_columns(grid[0])
    if columns is None:
        columns = {0: "name", 1: "price", 2: "description", 3: "category"}
        first_data_idx = 0
        warnings.append(
            "No header row found, so columns were read as: "
            "A name, B price, C description, D category."
        )
    raw_rows = []
    for idx in range(first_data_idx, len(grid)):
        cells = grid[idx]
        raw = {"row_no": idx + 1}
        for col_idx, field in columns.items():
            value = cells[col_idx] if col_idx < len(cells) else None
            raw["price_raw" if field == "price" else
                "available_raw" if field == "available" else field] = value
        raw_rows.append(raw)
        if len(raw_rows) >= MAX_ROWS:
            warnings.append(f"Only the first {MAX_ROWS} rows were read.")
            break
    return raw_rows, warnings


def _read_csv(data):
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("latin-1")
    try:
        dialect = csv.Sniffer().sniff(text[:2048], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    return [row for row in csv.reader(io.StringIO(text), dialect)]


def _read_xlsx(data):
    try:
        import openpyxl
    except ImportError:
        raise ValueError("Excel support is not installed on this server.")
    try:
        workbook = openpyxl.load_workbook(
            io.BytesIO(data), read_only=True, data_only=True
        )
    except Exception:
        raise ValueError("That .xlsx file could not be read. Try saving it again from Excel or Sheets.")
    sheet = workbook.active
    return [list(row) for row in sheet.iter_rows(values_only=True)]


def _detect_columns(header_cells):
    """Map column index -> field from a header row, or (None, 0) when the
    row does not look like a header (needs at least name + price)."""
    normalized = [
        re.sub(r"[^a-z0-9]", "", str(c).lower()) if c is not None else ""
        for c in header_cells
    ]
    columns = {}
    for idx, cell in enumerate(normalized):
        for field, aliases in _HEADER_ALIASES.items():
            if cell in aliases and field not in columns.values():
                columns[idx] = field
    if "name" in columns.values() and "price" in columns.values():
        return columns, 1
    return None, 0


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class _ImportView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffWriter]


class SheetPreviewView(_ImportView):
    """POST /api/staff/catalog/import/sheet-preview (multipart: file)."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response(
                {"error": "No file received (field name: file)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > MAX_SHEET_BYTES:
            return Response(
                {"error": "That file is larger than 2 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            raw_rows, warnings = _sheet_rows(upload)
        except ValueError as exc:
            return Response(
                {"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )
        rows, new_categories = _normalize_rows(raw_rows)
        return Response(
            {
                "source": "sheet",
                "rows": rows,
                "new_categories": new_categories,
                "warnings": warnings,
            }
        )


class ImagePreviewView(_ImportView):
    """POST /api/staff/catalog/import/image-preview (multipart: files)."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            return Response(
                {
                    "error": (
                        "Photo import is not switched on yet. Add a free "
                        "Gemini API key (GEMINI_API_KEY) to the server "
                        "settings and restart, or use the spreadsheet "
                        "import instead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        files = request.FILES.getlist("files")
        if not files:
            return Response(
                {"error": "No photos received."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(files) > MAX_IMAGES:
            return Response(
                {"error": f"Up to {MAX_IMAGES} menu photos at a time."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for f in files:
            if f.size > MAX_IMAGE_BYTES:
                return Response(
                    {"error": "Each photo must be under 5 MB."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if f.content_type not in {"image/jpeg", "image/png", "image/webp"}:
                return Response(
                    {"error": "Photos must be JPG, PNG or WEBP images."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        try:
            items = _gemini_extract(api_key, files)
        except ValueError as exc:
            return Response(
                {"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY
            )
        if not items:
            return Response(
                {
                    "error": (
                        "No menu items could be read from those photos. "
                        "Try clearer, straight-on photos with good light."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        raw_rows = [
            {
                "row_no": i + 1,
                "name": item.get("name"),
                "price_raw": item.get("price"),
                "description": item.get("description"),
                "category": item.get("category"),
                "available_raw": None,
            }
            for i, item in enumerate(items)
        ]
        rows, new_categories = _normalize_rows(raw_rows)
        return Response(
            {
                "source": "image",
                "rows": rows,
                "new_categories": new_categories,
                "warnings": [
                    "Read by AI from your photos - check every name and "
                    "price before importing."
                ],
            }
        )


def _gemini_models():
    """Vision models to try, in order. Google retires model names over
    time (a retired name returns 404), so the default is followed by
    fallbacks; GEMINI_MODEL in the server environment pins the first
    choice without a code change."""
    models = []
    pinned = os.environ.get("GEMINI_MODEL", "").strip()
    if pinned:
        models.append(pinned)
    for name in ("gemini-2.5-flash", "gemini-2.5-flash-lite",
                 "gemini-flash-latest"):
        if name not in models:
            models.append(name)
    return models


def _google_error_message(exc):
    """Best-effort read of Google's own error text from an HTTPError."""
    try:
        payload = json.loads(exc.read().decode("utf-8"))
        message = payload.get("error", {}).get("message", "")
        return str(message).strip()[:200]
    except Exception:
        return ""


def _gemini_extract(api_key, files):
    parts = [{"text": _GEMINI_PROMPT}]
    for f in files:
        parts.append(
            {
                "inline_data": {
                    "mime_type": f.content_type,
                    "data": base64.b64encode(f.read()).decode("ascii"),
                }
            }
        )
    body = json.dumps(
        {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }
    ).encode("utf-8")

    payload = None
    last_error = ""
    for model in _gemini_models():
        request = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent",
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            message = _google_error_message(exc)
            if exc.code in (404, 429, 503):
                # 404: model name retired. 429/503: that model is rate
                # limited or overloaded. Either way another model in the
                # list may answer, so keep going.
                last_error = f"({exc.code}) {message}".strip()
                continue
            detail = f": {message}" if message else ""
            raise ValueError(
                f"The photo reader returned an error ({exc.code}){detail} "
                "Check the Gemini API key and try again."
            )
        except Exception as exc:
            # Timeout or network failure on this model - it is often the
            # overloaded model hanging rather than a dead connection, so
            # record it and let the next model try.
            last_error = f"connection problem ({type(exc).__name__})"
            continue
    if payload is None:
        detail = f": {last_error}" if last_error else ""
        raise ValueError(
            "The photo reader did not answer on any model right "
            f"now{detail}. Please wait a minute and try again; if it "
            "keeps happening, check the server internet connection."
        )
    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise ValueError(
            "The photo reader could not read these photos. "
            "Try clearer photos."
        )
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    try:
        data = json.loads(text)
    except ValueError:
        raise ValueError(
            "The photo reader sent back something unreadable. "
            "Please try again."
        )
    items = data.get("items") if isinstance(data, dict) else data
    if not isinstance(items, list):
        return []
    return [item for item in items if isinstance(item, dict)]


class ImportCommitView(_ImportView):
    """POST /api/staff/catalog/import/commit {rows: [...]} - creates the
    reviewed rows in one transaction; duplicates are skipped, never
    overwritten."""

    def post(self, request):
        rows = request.data.get("rows")
        if not isinstance(rows, list) or not rows:
            return Response(
                {"error": "No rows to import."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(rows) > MAX_ROWS:
            return Response(
                {"error": f"At most {MAX_ROWS} rows per import."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cleaned = []
        for i, row in enumerate(rows):
            if not isinstance(row, dict):
                return Response(
                    {"error": f"Row {i + 1} is not a valid item."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            name = str(row.get("name") or "").strip()
            price = row.get("price_pkr")
            if not name:
                return Response(
                    {"error": f"Row {i + 1}: missing name."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if isinstance(price, bool) or not isinstance(price, int) or price < 0:
                return Response(
                    {"error": f"Row {i + 1}: price must be a whole number, 0 or more."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cleaned.append(
                {
                    "name": name[:120],
                    "price_pkr": price,
                    "description": str(row.get("description") or "").strip()[:2000],
                    "category": (
                        str(row.get("category") or "").strip()[:80]
                        or DEFAULT_CATEGORY
                    ),
                    "is_available": row.get("is_available")
                    if isinstance(row.get("is_available"), bool)
                    else True,
                }
            )
        created_categories = []
        created_items = 0
        skipped = 0
        with transaction.atomic():
            categories = {c.name.lower(): c for c in Category.objects.all()}
            existing = {
                (item.category.name.lower(), item.name.lower())
                for item in MenuItem.objects.select_related("category")
            }
            next_cat_sort = (
                max([c.sort for c in categories.values()], default=-1) + 1
            )
            sort_counters = {}
            for item in MenuItem.objects.all():
                sort_counters[item.category_id] = max(
                    sort_counters.get(item.category_id, -1), item.sort
                )
            for row in cleaned:
                cat_key = row["category"].lower()
                category = categories.get(cat_key)
                if category is None:
                    category = Category.objects.create(
                        name=row["category"], sort=next_cat_sort
                    )
                    next_cat_sort += 1
                    categories[cat_key] = category
                    created_categories.append(category.name)
                item_key = (cat_key, row["name"].lower())
                if item_key in existing:
                    skipped += 1
                    continue
                sort = sort_counters.get(category.id, -1) + 1
                sort_counters[category.id] = sort
                MenuItem.objects.create(
                    category=category,
                    name=row["name"],
                    description=row["description"],
                    price_pkr=row["price_pkr"],
                    is_available=row["is_available"],
                    sort=sort,
                )
                existing.add(item_key)
                created_items += 1
        return Response(
            {
                "created_items": created_items,
                "created_categories": created_categories,
                "skipped_duplicates": skipped,
            },
            status=status.HTTP_201_CREATED,
        )
