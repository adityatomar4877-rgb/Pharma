from typing import List, Dict

# CPIC phenotype assignments: (allele1, allele2) → (phenotype_code, activity_score, confidence)
PHENOTYPE_MAP = {
    "CYP2C9": {
        ("*1",  "*1"):  ("NM", 2.0, 0.95),
        ("*1",  "*2"):  ("IM", 1.5, 0.90),
        ("*1",  "*3"):  ("IM", 1.0, 0.90),
        ("*2",  "*2"):  ("PM", 1.0, 0.95),
        ("*2",  "*3"):  ("PM", 0.5, 0.85),
        ("*3",  "*3"):  ("PM", 0.0, 0.95),
        ("*1",  "*5"):  ("IM", 1.0, 0.85),
        ("*1",  "*6"):  ("IM", 1.0, 0.85),
    },
    "CYP2D6": {
        ("*1",  "*1"):  ("NM",  2.0, 0.95),
        ("*1",  "*2"):  ("NM",  2.0, 0.90),
        ("*2",  "*2"):  ("URM", 3.0, 0.85),
        ("*1",  "*4"):  ("IM",  1.0, 0.90),
        ("*4",  "*4"):  ("PM",  0.0, 0.95),
        ("*1",  "*10"): ("IM",  1.25, 0.85),
        ("*1",  "*3"):  ("IM",  1.0, 0.85),
        ("*1",  "*6"):  ("IM",  1.0, 0.85),
    },
    "CYP2C19": {
        ("*1",  "*1"):  ("NM",  2.0, 0.95),
        ("*1",  "*2"):  ("IM",  1.0, 0.90),
        ("*2",  "*2"):  ("PM",  0.0, 0.95),
        ("*1",  "*3"):  ("IM",  1.0, 0.90),
        ("*2",  "*3"):  ("PM",  0.0, 0.95),
        ("*1",  "*17"): ("RM",  2.5, 0.85),
        ("*17", "*17"): ("URM", 3.0, 0.90),
        ("*2",  "*17"): ("IM",  1.5, 0.80),
    },
    "SLCO1B1": {
        ("*1",   "*1"):  ("NM", None, 0.95),
        ("*1",   "*5"):  ("IM", None, 0.90),
        ("*5",   "*5"):  ("PM", None, 0.95),
        ("*1",   "*1b"): ("NM", None, 0.85),
    },
    "TPMT": {
        ("*1",  "*1"):  ("NM", None, 0.95),
        ("*1",  "*2"):  ("IM", None, 0.90),
        ("*1",  "*3B"): ("IM", None, 0.90),
        ("*1",  "*3C"): ("IM", None, 0.90),
        ("*3B", "*3C"): ("PM", None, 0.95),
        ("*3C", "*3C"): ("PM", None, 0.95),
    },
    "DPYD": {
        ("*1",    "*1"):       ("NM", None, 0.95),
        ("*1",    "*2A"):      ("IM", None, 0.90),
        ("*2A",   "*2A"):      ("PM", None, 0.95),
        ("*1",    "*13"):      ("IM", None, 0.90),
        ("*1",    "c.2846A>T"):("IM", None, 0.85),
        ("*1",    "HapB3"):    ("IM", None, 0.85),
    },
}

PHENOTYPE_LABELS = {
    "PM":  "Poor Metabolizer",
    "IM":  "Intermediate Metabolizer",
    "NM":  "Normal Metabolizer",
    "RM":  "Rapid Metabolizer",
    "URM": "Ultrarapid Metabolizer",
}


def infer_phenotype(gene: str, star_alleles: List[str]) -> Dict:
    """
    Map diplotype star alleles to CPIC phenotype.
    Tries both orderings of the allele pair.
    """
    gene_map = PHENOTYPE_MAP.get(gene, {})

    key_forward = tuple(star_alleles)
    key_reverse = tuple(reversed(star_alleles))

    result = gene_map.get(key_forward) or gene_map.get(key_reverse)

    if result:
        phenotype_code, activity_score, confidence = result
        return {
            "phenotype_code":  phenotype_code,
            "phenotype_label": PHENOTYPE_LABELS.get(phenotype_code, "Unknown"),
            "activity_score":  activity_score,
            "confidence":      confidence,
        }

    return {
        "phenotype_code":  "Unknown",
        "phenotype_label": "Unknown Metabolizer Status",
        "activity_score":  None,
        "confidence":      0.5,
    }
