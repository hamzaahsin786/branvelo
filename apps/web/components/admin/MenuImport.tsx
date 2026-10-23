"use client";

import { useMemo, useState } from "react";
import { staffFetch, useStaffApi } from "@/lib/staff-api";

interface PreviewRow {
  row_no: number | null;
  name: string;
  price_pkr: number | null;
  description: string;
  category: string;
  is_available: boolean;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
  category_is_new: boolean;
  include: boolean;
}

interface EditRow {
  row_no: number | null;
  name: string;
  price: string;
  description: string;
  category: string;
  is_available: boolean;
  warnings: string[];
  duplicate: boolean;
  category_is_new: boolean;
  include: boolean;
}

interface ImportResult {
  created_items: number;
  created_categories: string[];
  skipped_duplicates: number;
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

const inputCls =
  "w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-900";

/** Menu import: spreadsheet or menu photos -> editable preview -> commit.
 * Nothing is written until the owner reviews the rows and confirms. */
export function MenuImport({ onClose, onImported }: Props) {
  const api = useStaffApi();
  const [tab, setTab] = useState<"sheet" | "photo">("sheet");
  const [stage, setStage] = useState<"pick" | "preview" | "done">("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const liveError = (r: EditRow): string | null => {
    if (!r.name.trim()) return "Missing name";
    if (!/^\d+$/.test(r.price.trim()))
      return "Price must be a whole number";
    return null;
  };

  const importable = useMemo(
    () => rows.filter((r) => r.include && !liveError(r)),
    [rows],
  );

  async function runPreview(kind: "sheet" | "photo") {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      let path: string;
      if (kind === "sheet") {
        if (!sheetFile) throw new Error("Choose a spreadsheet file first.");
        form.append("file", sheetFile);
        path = "/api/staff/catalog/import/sheet-preview";
      } else {
        if (!photoFiles.length)
          throw new Error("Choose at least one menu photo first.");
        photoFiles.forEach((f) => form.append("files", f));
        path = "/api/staff/catalog/import/image-preview";
      }
      const res = await staffFetch(path, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Could not read that file.");
      }
      const preview = data as {
        rows: PreviewRow[];
        warnings: string[];
      };
      setWarnings(preview.warnings ?? []);
      setRows(
        preview.rows.map((r) => ({
          row_no: r.row_no,
          name: r.name ?? "",
          price: r.price_pkr != null ? String(r.price_pkr) : "",
          description: r.description ?? "",
          category: r.category ?? "General",
          is_available: r.is_available,
          warnings: r.warnings ?? [],
          duplicate: r.duplicate,
          category_is_new: r.category_is_new,
          include: r.include,
        })),
      );
      setStage("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    setError(null);
    setBusy(true);
    try {
      const payload = importable.map((r) => ({
        name: r.name.trim(),
        price_pkr: parseInt(r.price.trim(), 10),
        description: r.description.trim(),
        category: r.category.trim() || "General",
        is_available: r.is_available,
      }));
      const res = await api("/api/staff/catalog/import/commit", {
        method: "POST",
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Import failed.");
      }
      setResult(data as ImportResult);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  const setRow = (idx: number, patch: Partial<EditRow>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold">Import menu</h2>
        <button
          onClick={onClose}
          className="rounded-full px-3 py-1 text-sm font-bold text-neutral-500 hover:bg-neutral-50"
        >
          Close
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {stage === "pick" && (
        <div className="mt-3">
          <div className="flex gap-2">
            {(
              [
                ["sheet", "Spreadsheet"],
                ["photo", "Menu photos"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  tab === key
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "sheet" ? (
            <div className="mt-4">
              <p className="text-sm text-neutral-500">
                Upload a CSV or Excel file. Best with a header row: name,
                price, description, category. Without headers, columns are
                read as A name, B price, C description, D category.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-full bg-neutral-100 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-200">
                  Choose file
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(e) =>
                      setSheetFile(e.target.files?.[0] ?? null)
                    }
                  />
                </label>
                <span className="text-sm font-semibold text-neutral-500">
                  {sheetFile ? sheetFile.name : "No file chosen"}
                </span>
                <button
                  onClick={() => runPreview("sheet")}
                  disabled={busy || !sheetFile}
                  className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy ? "Reading..." : "Read file"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-neutral-500">
                Upload up to 4 clear photos of the printed menu. An AI reader
                extracts the items and prices for you to review - always
                check them before importing.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-full bg-neutral-100 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-200">
                  Choose photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      setPhotoFiles(Array.from(e.target.files ?? []).slice(0, 4))
                    }
                  />
                </label>
                <span className="text-sm font-semibold text-neutral-500">
                  {photoFiles.length
                    ? photoFiles.map((f) => f.name).join(", ")
                    : "No photos chosen"}
                </span>
                <button
                  onClick={() => runPreview("photo")}
                  disabled={busy || !photoFiles.length}
                  className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy ? "Reading photos..." : "Read photos"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === "preview" && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-neutral-600">
            {rows.length} items read. Review and fix anything, untick what
            you do not want, then import.
          </p>
          {warnings.length > 0 && (
            <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-neutral-400">
                  <th className="py-2 pr-2">Add</th>
                  <th className="py-2 pr-2">Item</th>
                  <th className="py-2 pr-2">Price (Rs)</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const err = liveError(r);
                  return (
                    <tr key={i} className="border-t border-neutral-100 align-top">
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={r.include && !err}
                          disabled={!!err}
                          onChange={(e) =>
                            setRow(i, { include: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={r.name}
                          onChange={(e) => setRow(i, { name: e.target.value })}
                          className={inputCls}
                        />
                      </td>
                      <td className="w-24 py-2 pr-2">
                        <input
                          value={r.price}
                          onChange={(e) =>
                            setRow(i, {
                              price: e.target.value.replace(/[^\d]/g, ""),
                            })
                          }
                          inputMode="numeric"
                          className={inputCls}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={r.category}
                          onChange={(e) =>
                            setRow(i, { category: e.target.value })
                          }
                          className={inputCls}
                        />
                        {r.category_is_new && (
                          <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                            New category
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={r.description}
                          onChange={(e) =>
                            setRow(i, { description: e.target.value })
                          }
                          className={inputCls}
                        />
                      </td>
                      <td className="py-2 text-xs">
                        {err && (
                          <p className="font-bold text-red-600">{err}</p>
                        )}
                        {r.warnings.map((w) => (
                          <p key={w} className="font-semibold text-amber-600">
                            {w}
                          </p>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={runCommit}
              disabled={busy || importable.length === 0}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy
                ? "Importing..."
                : `Import ${importable.length} item${importable.length === 1 ? "" : "s"}`}
            </button>
            <button
              onClick={() => setStage("pick")}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-neutral-500"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {stage === "done" && result && (
        <div className="mt-3">
          <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">
            Import complete: {result.created_items} item
            {result.created_items === 1 ? "" : "s"} added
            {result.created_categories.length > 0 &&
              `, new categories: ${result.created_categories.join(", ")}`}
            {result.skipped_duplicates > 0 &&
              `, ${result.skipped_duplicates} skipped (already on the menu)`}
            .
          </p>
          <button
            onClick={onImported}
            className="mt-3 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white"
          >
            Back to menu
          </button>
        </div>
      )}
    </section>
  );
}
