"""
PharmaGuard · Drug Risk Engine
Maps drugs to ALL relevant genes (multi-gene) and assesses risk.
"""

from typing import Dict, List, Optional

# ── Multi-gene drug map ───────────────────────────────────────────────────────
# First gene in each list = PRIMARY gene used for phenotype/diplotype
# All genes = parsed from VCF and reported in results
DRUG_GENE_MAP: Dict[str, List[str]] = {
    "WARFARIN":     ["CYP2C9", "VKORC1", "CYP4F2", "GGCX", "CALU", "CYP2C19", "PROS1", "F5"],
    "CODEINE":      ["CYP2D6"],
    "CLOPIDOGREL":  ["CYP2C19", "ABCB1"],
    "SIMVASTATIN":  ["SLCO1B1", "CYP3A4"],
    "AZATHIOPRINE": ["TPMT", "NUDT15"],
    "FLUOROURACIL": ["DPYD", "TYMS"],
}

# ── Risk tables ───────────────────────────────────────────────────────────────
# Keyed by (drug, phenotype_code) → risk details
RISK_TABLE: Dict[tuple, Dict] = {
    # WARFARIN — CYP2C9
    ("WARFARIN", "PM"):  {"risk_label": "Toxic",         "severity": "high",   "action": "High bleeding risk — reduce dose significantly or choose alternative anticoagulant.", "dosing_adjustment": "Reduce by 50–75%", "monitoring": "INR weekly", "cpic_guideline": "CPIC Warfarin 2017", "alternatives": ["APIXABAN", "RIVAROXABAN"]},
    ("WARFARIN", "IM"):  {"risk_label": "Adjust Dosage", "severity": "medium", "action": "Reduced metabolism — start with lower warfarin dose.", "dosing_adjustment": "Reduce by 25–50%", "monitoring": "INR every 2 weeks", "cpic_guideline": "CPIC Warfarin 2017", "alternatives": []},
    ("WARFARIN", "NM"):  {"risk_label": "Safe",          "severity": "low",    "action": "Normal warfarin metabolism expected. Use standard dosing.", "dosing_adjustment": "Standard dose", "monitoring": "Routine INR", "cpic_guideline": "CPIC Warfarin 2017", "alternatives": []},
    ("WARFARIN", "UM"):  {"risk_label": "Ineffective",   "severity": "medium", "action": "Ultrarapid metabolism — warfarin may be ineffective at standard doses.", "dosing_adjustment": "May need higher dose", "monitoring": "INR closely", "cpic_guideline": "CPIC Warfarin 2017", "alternatives": ["APIXABAN"]},
    # VKORC1 sensitive
    ("WARFARIN", "Sensitive"):  {"risk_label": "Adjust Dosage", "severity": "medium", "action": "VKORC1 variant detected — patient is sensitive to warfarin.", "dosing_adjustment": "Reduce by 20–40%", "monitoring": "INR weekly initially", "cpic_guideline": "CPIC Warfarin 2017", "alternatives": []},
    ("WARFARIN", "Resistant"):  {"risk_label": "Ineffective",   "severity": "medium", "action": "VKORC1 resistance variant — higher warfarin dose likely needed.", "dosing_adjustment": "May need higher dose", "monitoring": "INR closely", "cpic_guideline": "CPIC Warfarin 2017", "alternatives": []},
    ("WARFARIN", "Thrombophilic"): {"risk_label": "Adjust Dosage", "severity": "high", "action": "Factor V Leiden detected — higher INR target may be required.", "dosing_adjustment": "Higher target INR (2.5–3.5)", "monitoring": "INR and clotting studies", "cpic_guideline": "CPIC Warfarin 2017", "alternatives": []},
    ("WARFARIN", "Deficient"):  {"risk_label": "Toxic",         "severity": "high",   "action": "Protein S deficiency — increased bleeding risk with warfarin.", "dosing_adjustment": "Use with extreme caution", "monitoring": "INR weekly + bleeding signs", "cpic_guideline": "CPIC Warfarin 2017", "alternatives": ["APIXABAN", "RIVAROXABAN"]},

    # CODEINE — CYP2D6
    ("CODEINE", "PM"):  {"risk_label": "Ineffective",   "severity": "medium", "action": "Poor metabolizer — codeine cannot be converted to morphine. Use alternative.", "dosing_adjustment": "Avoid codeine", "monitoring": "Pain response", "cpic_guideline": "CPIC Codeine 2021", "alternatives": ["MORPHINE", "HYDROMORPHONE"]},
    ("CODEINE", "UM"):  {"risk_label": "Toxic",         "severity": "high",   "action": "Ultrarapid metabolizer — dangerous morphine accumulation. Avoid codeine.", "dosing_adjustment": "Contraindicated", "monitoring": "Respiratory function", "cpic_guideline": "CPIC Codeine 2021", "alternatives": ["MORPHINE", "HYDROMORPHONE"]},
    ("CODEINE", "IM"):  {"risk_label": "Adjust Dosage", "severity": "low",    "action": "Intermediate metabolizer — reduced analgesic effect possible.", "dosing_adjustment": "Standard or slightly higher dose", "monitoring": "Pain response", "cpic_guideline": "CPIC Codeine 2021", "alternatives": []},
    ("CODEINE", "NM"):  {"risk_label": "Safe",          "severity": "low",    "action": "Normal codeine metabolism expected.", "dosing_adjustment": "Standard dose", "monitoring": "Routine", "cpic_guideline": "CPIC Codeine 2021", "alternatives": []},

    # CLOPIDOGREL — CYP2C19
    ("CLOPIDOGREL", "PM"):  {"risk_label": "Ineffective",   "severity": "high",   "action": "Poor metabolizer — clopidogrel cannot be activated. High risk of treatment failure.", "dosing_adjustment": "Avoid clopidogrel", "monitoring": "Platelet function", "cpic_guideline": "CPIC Clopidogrel 2022", "alternatives": ["TICAGRELOR", "PRASUGREL"]},
    ("CLOPIDOGREL", "IM"):  {"risk_label": "Adjust Dosage", "severity": "medium", "action": "Reduced activation — consider alternative antiplatelet therapy.", "dosing_adjustment": "Consider alternative", "monitoring": "Platelet function", "cpic_guideline": "CPIC Clopidogrel 2022", "alternatives": ["TICAGRELOR"]},
    ("CLOPIDOGREL", "NM"):  {"risk_label": "Safe",          "severity": "low",    "action": "Normal clopidogrel activation expected.", "dosing_adjustment": "Standard dose", "monitoring": "Routine", "cpic_guideline": "CPIC Clopidogrel 2022", "alternatives": []},
    ("CLOPIDOGREL", "UM"):  {"risk_label": "Safe",          "severity": "low",    "action": "Ultrarapid metabolizer — may have enhanced effect.", "dosing_adjustment": "Standard dose, monitor bleeding", "monitoring": "Bleeding signs", "cpic_guideline": "CPIC Clopidogrel 2022", "alternatives": []},

    # SIMVASTATIN — SLCO1B1
    ("SIMVASTATIN", "Poor Function"):  {"risk_label": "Toxic",         "severity": "high",   "action": "High risk of statin-induced myopathy. Use lower dose or alternative.", "dosing_adjustment": "Max 20mg/day or switch", "monitoring": "CK levels monthly", "cpic_guideline": "CPIC Simvastatin 2022", "alternatives": ["ROSUVASTATIN", "PRAVASTATIN"]},
    ("SIMVASTATIN", "Decreased Function"): {"risk_label": "Adjust Dosage", "severity": "medium", "action": "Moderately increased myopathy risk.", "dosing_adjustment": "Max 40mg/day", "monitoring": "CK levels", "cpic_guideline": "CPIC Simvastatin 2022", "alternatives": []},
    ("SIMVASTATIN", "NM"):  {"risk_label": "Safe",          "severity": "low",    "action": "Normal simvastatin transport. Standard dosing appropriate.", "dosing_adjustment": "Standard dose", "monitoring": "Routine", "cpic_guideline": "CPIC Simvastatin 2022", "alternatives": []},

    # AZATHIOPRINE — TPMT
    ("AZATHIOPRINE", "PM"):  {"risk_label": "Toxic",         "severity": "high",   "action": "TPMT poor metabolizer — very high risk of life-threatening myelosuppression.", "dosing_adjustment": "Reduce by 90% or use alternative", "monitoring": "CBC weekly", "cpic_guideline": "CPIC Azathioprine 2018", "alternatives": ["MYCOPHENOLATE"]},
    ("AZATHIOPRINE", "IM"):  {"risk_label": "Adjust Dosage", "severity": "medium", "action": "Intermediate metabolizer — increased myelosuppression risk.", "dosing_adjustment": "Reduce by 30–50%", "monitoring": "CBC every 2 weeks", "cpic_guideline": "CPIC Azathioprine 2018", "alternatives": []},
    ("AZATHIOPRINE", "NM"):  {"risk_label": "Safe",          "severity": "low",    "action": "Normal TPMT activity. Standard azathioprine dosing appropriate.", "dosing_adjustment": "Standard dose", "monitoring": "Routine CBC", "cpic_guideline": "CPIC Azathioprine 2018", "alternatives": []},

    # FLUOROURACIL — DPYD
    ("FLUOROURACIL", "PM"):  {"risk_label": "Toxic",         "severity": "high",   "action": "DPYD poor metabolizer — life-threatening 5-FU toxicity risk.", "dosing_adjustment": "Avoid or reduce by 50%+", "monitoring": "Toxicity signs closely", "cpic_guideline": "CPIC Fluorouracil 2022", "alternatives": ["CAPECITABINE at reduced dose"]},
    ("FLUOROURACIL", "IM"):  {"risk_label": "Adjust Dosage", "severity": "medium", "action": "Intermediate DPYD function — increased toxicity risk.", "dosing_adjustment": "Reduce by 25–50%", "monitoring": "Toxicity monitoring", "cpic_guideline": "CPIC Fluorouracil 2022", "alternatives": []},
    ("FLUOROURACIL", "NM"):  {"risk_label": "Safe",          "severity": "low",    "action": "Normal DPYD activity. Standard 5-FU dosing appropriate.", "dosing_adjustment": "Standard dose", "monitoring": "Routine", "cpic_guideline": "CPIC Fluorouracil 2022", "alternatives": []},
}

_DEFAULT_RISK = {
    "risk_label":       "Unknown",
    "severity":         "none",
    "action":           "Insufficient pharmacogenomic data to determine risk.",
    "dosing_adjustment": None,
    "monitoring":       "Standard clinical monitoring recommended.",
    "cpic_guideline":   None,
    "alternatives":     [],
}


def assess_drug_risk(drug: str, phenotype_code: str, confidence: float) -> Dict:
    """
    Look up risk for drug + phenotype. Returns risk dict with confidence attached.
    Tries exact match first, then partial match on phenotype_code.
    """
    key = (drug.upper(), phenotype_code)
    risk = RISK_TABLE.get(key)

    # Partial match — e.g. phenotype_code "IM (CYP2C9)" → try "IM"
    if risk is None:
        for (d, p), r in RISK_TABLE.items():
            if d == drug.upper() and phenotype_code.startswith(p):
                risk = r
                break

    result = dict(risk or _DEFAULT_RISK)
    result["confidence_score"] = confidence
    return result