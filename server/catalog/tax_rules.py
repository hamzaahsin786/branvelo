"""Per-country consumption-tax defaults for restaurant orders.

The restaurant's country picks the default rule; the profile's rate
fields override it. These are the STANDARD rates for restaurant food
services - provinces and states differ (Pakistan is the big one: its
rates depend on the province AND on whether the customer pays cash or
digitally), so the override fields exist for exactly that. Rates here
are a starting point the restaurant must confirm with its own tax
adviser; they are not legal advice.

Pakistan (verified against 2026 reporting of the provincial finance
acts): Punjab PRA charges 16% on cash/other payments and 8% on digital
payments (cards, mobile wallets, QR - Finance Act 2026, up from 5%).
Sindh SRB charges 15% on cash and 8% on digital. The PK default below
is the Punjab pair (16/8); a Sindh restaurant sets its standard rate
to 15 in Settings.
"""

# Digital payment methods (see ordering Payment choices + future card).
DIGITAL_METHODS = {"jazzcash", "easypaisa", "card"}

# code: (tax name, standard rate %, digital rate % or None, note)
COUNTRY_TAX_RULES = {
    "PK": ("GST", 16, 8, "Punjab PRA 16% cash / 8% digital; Sindh SRB 15% cash / 8% digital."),
    "IN": ("GST", 5, None, "Restaurant services, 5% without input tax credit."),
    "AE": ("VAT", 5, None, "UAE standard VAT rate."),
    "SA": ("VAT", 15, None, "Saudi standard VAT rate."),
    "GB": ("VAT", 20, None, "UK standard VAT rate for restaurant meals."),
    "US": ("Sales tax", 0, None, "No federal VAT; state and city rates vary - set your rate."),
    "CA": ("GST", 5, None, "Federal GST; HST provinces charge more - override if needed."),
    "AU": ("GST", 10, None, "Australian GST."),
    "DE": ("VAT", 19, None, "German standard VAT rate."),
    "BD": ("VAT", 15, None, "Bangladesh standard VAT rate."),
    "EG": ("VAT", 14, None, "Egypt standard VAT rate."),
    "NG": ("VAT", 7.5, None, "Nigeria standard VAT rate."),
    "KE": ("VAT", 16, None, "Kenya standard VAT rate."),
    "ZA": ("VAT", 15, None, "South Africa standard VAT rate."),
    "LK": ("VAT", 18, None, "Sri Lanka standard VAT rate."),
    "OM": ("VAT", 5, None, "Oman standard VAT rate."),
    "BH": ("VAT", 10, None, "Bahrain standard VAT rate."),
    "JO": ("GST", 16, None, "Jordan general sales tax."),
}


def resolve_tax(profile, payment_method):
    """The tax rule for one order: {name, rate, standard_rate,
    digital_rate, country}. The payment method picks the rate where a
    country has a digital rate (Pakistan); otherwise one rate applies."""
    rule = COUNTRY_TAX_RULES.get(
        (profile.tax_country or "PK").upper(), COUNTRY_TAX_RULES["PK"]
    )
    name = profile.tax_name or rule[0]
    standard = (
        profile.tax_rate_percent if profile.tax_rate_percent is not None
        else rule[1]
    )
    digital = (
        profile.tax_digital_rate_percent
        if profile.tax_digital_rate_percent is not None
        else rule[2]
    )
    rate = digital if payment_method in DIGITAL_METHODS and digital is not None else standard
    return {
        "name": name,
        "rate": rate,
        "standard_rate": standard,
        "digital_rate": digital,
        "country": (profile.tax_country or "PK").upper(),
    }


def calc_tax(amount_pkr, rate):
    """Whole-rupee tax on an amount at a percentage rate."""
    if not rate:
        return 0
    return int(round(amount_pkr * rate / 100))
