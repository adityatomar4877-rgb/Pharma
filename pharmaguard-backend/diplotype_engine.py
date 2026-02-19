from typing import List, Dict, Optional

# CPIC-defined star allele rsID mappings per gene
STAR_ALLELE_MAP = {
    "CYP2C9": {
        "rs1799853":  "*2",
        "rs1057910":  "*3",
        "rs28371686": "*5",
        "rs9332131":  "*6",
    },
    "CYP2D6": {
        "rs3892097":  "*4",
        "rs35742686": "*3",
        "rs5030655":  "*6",
        "rs16947":    "*2",
        "rs1135840":  "*10",
    },
    "CYP2C19": {
        "rs4244285":  "*2",
        "rs4986893":  "*3",
        "rs28399504": "*4",
        "rs12248560": "*17",
    },
    "SLCO1B1": {
        "rs4149056":  "*5",
        "rs2306283":  "*1b",
    },
    "TPMT": {
        "rs1800462":  "*2",
        "rs1800460":  "*3B",
        "rs1142345":  "*3C",
        "rs1800584":  "*4",
    },
    "DPYD": {
        "rs3918290":  "*2A",
        "rs55886062": "*13",
        "rs67376798": "c.2846A>T",
        "rs75017182": "HapB3",
    },
}


def resolve_diplotype(variants: List[Dict], gene: str) -> Optional[Dict]:
    """
    Deterministically resolve diplotype from detected variants.
    Returns None if no variants found for this gene — never fabricates.
    """
    gene_variants = [v for v in variants if v["gene"] == gene]

    if not gene_variants:
        return None  # CRITICAL: honest return, no hallucination

    allele_map = STAR_ALLELE_MAP.get(gene, {})
    star_alleles = []
    matched_variants = []

    for v in gene_variants:
        rsid = v["rsid"]
        gt = v["genotype"]  # e.g., "0/1", "1/1", "0|1"

        # Normalize phased/unphased
        gt_normalized = gt.replace("|", "/")
        alleles = gt_normalized.split("/")

        if rsid in allele_map:
            star = allele_map[rsid]
            alt_count = alleles.count("1")

            if alt_count == 2:   # homozygous alt
                star_alleles.extend([star, star])
            elif alt_count == 1:  # heterozygous
                star_alleles.append(star)

            matched_variants.append(v)

    # Fill remaining with *1 (wild-type reference)
    while len(star_alleles) < 2:
        star_alleles.insert(0, "*1")

    # Cap at 2 alleles (diploid)
    star_alleles = star_alleles[:2]

    diplotype = f"{star_alleles[0]}/{star_alleles[1]}"

    return {
        "diplotype":        diplotype,
        "star_alleles":     star_alleles,
        "matched_variants": matched_variants,
        "total_variants":   len(gene_variants),
    }
