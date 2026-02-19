import uuid
from dotenv import load_dotenv
import pathlib
# Load .env from the same directory as this file — works regardless of where uvicorn is launched from
load_dotenv(dotenv_path=pathlib.Path(__file__).parent / ".env")
from datetime import datetime

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from diplotype_engine import resolve_diplotype
from drug_risk_engine import DRUG_GENE_MAP, assess_drug_risk
from llm_explainer import generate_explanation
from phenotype_engine import infer_phenotype
from vcf_parser import get_gene_coverage, parse_vcf, validate_vcf_content

app = FastAPI(
    title="PharmaGuard API",
    description="Pharmacogenomic Risk Prediction System — RIFT 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


# ── Confidence Calculator ──────────────────────────────────────────────────────

CLINSIG_SCORES = {
    "pathogenic":              1.00,
    "likely_pathogenic":       0.85,
    "risk_factor":             0.65,
    "uncertain_significance":  0.40,
    "likely_benign":           0.20,
    "benign":                  0.10,
}

def compute_confidence(variants: list) -> float:
    """
    Dynamically compute confidence score (0.0–0.95) from VCF variant signals.
    Replaces the hardcoded 0.90 value.

    Weights:
      QUAL score          25%
      Read depth (DP)     25%
      Genotype quality    20%  (falls back to QUAL if GQ absent)
      FILTER = PASS       15%
      Clinical sig tier   10%
      AF penalty           soft penalty if AF < 0.10
    """
    if not variants:
        return 0.0

    scores = []
    for v in variants:
        qual  = float(v.get("qual") or 0)
        depth = int(v.get("depth") or 0)
        filt  = str(v.get("filter") or "UNKNOWN").split(",")[0].strip().upper()
        clinsig = str(v.get("clinical_significance") or "").lower().replace(" ", "_")
        af    = v.get("allele_freq")

        qual_score   = min(qual, 99) / 99
        depth_score  = min(depth, 200) / 200
        gq_score     = qual_score          # GQ not stored by vcf_parser; fall back to QUAL
        filter_score = 1.0 if filt == "PASS" else 0.0
        clinsig_score = CLINSIG_SCORES.get(clinsig, 0.30)

        raw = (
            qual_score    * 0.25 +
            depth_score   * 0.25 +
            gq_score      * 0.20 +
            filter_score  * 0.15 +
            clinsig_score * 0.10
        )  # max possible = 0.95 (evidence weight removed since not in VCF parser output)

        # Soft penalty: very low AF calls are less reliable
        if af is not None and af < 0.10:
            raw -= (0.10 - af) * 0.5

        scores.append(max(0.0, raw))

    # Average across all matched variants, cap at 0.95
    avg = sum(scores) / len(scores)
    return round(min(0.95, max(0.05, avg)), 2)


@app.get("/")
def root():
    return {"status": "ok", "service": "PharmaGuard API", "version": "1.0.0"}


@app.get("/debug-env")
def debug_env():
    import os
    key = os.getenv("GEMINI_API_KEY")
    return {
        "GEMINI_API_KEY_present": key is not None,
        "GEMINI_API_KEY_length": len(key) if key else 0,
        "GEMINI_API_KEY_preview": key[:8] + "..." if key else "NOT FOUND",
    }


@app.get("/supported-drugs")
def supported_drugs():
    return {"drugs": list(DRUG_GENE_MAP.keys())}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    drug: str = Form(...),
):
    # ── 1. Read file ───────────────────────────────────────────────────
    content_bytes = await file.read()

    if len(content_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit.")

    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = content_bytes.decode("latin-1")

    # ── 2. Validate VCF ───────────────────────────────────────────────
    is_valid, error_msg = validate_vcf_content(content)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid VCF file: {error_msg}")

    # ── 3. Parse VCF ──────────────────────────────────────────────────
    try:
        variants = parse_vcf(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"VCF parsing failed: {str(e)}")

    # ── 4. Validate drug ──────────────────────────────────────────────
    drug_upper = drug.strip().upper()
    gene_entry = DRUG_GENE_MAP.get(drug_upper)

    if not gene_entry:
        raise HTTPException(
            status_code=400,
            detail=f"Drug '{drug}' not supported. Supported: {list(DRUG_GENE_MAP.keys())}",
        )

    # Support both old str format and new list format
    if isinstance(gene_entry, list):
        all_genes   = gene_entry          # e.g. ["CYP2C9", "VKORC1", "CYP4F2", ...]
        primary_gene = gene_entry[0]      # first gene is always primary
    else:
        all_genes    = [gene_entry]
        primary_gene = gene_entry

    # ── 5. Resolve diplotype per gene, collect all matched variants ──
    all_matched       = []
    gene_profiles     = {}
    primary_diplotype = "Unknown"
    primary_phenotype = None

    for g in all_genes:
        g_result = resolve_diplotype(variants, g)
        if g_result is None:
            continue
        g_phenotype = infer_phenotype(g, g_result["star_alleles"])
        gene_profiles[g] = {
            "diplotype":       g_result["diplotype"],
            "phenotype_code":  g_phenotype["phenotype_code"],
            "phenotype_label": g_phenotype["phenotype_label"],
            "matched_variants": g_result["matched_variants"],
        }
        all_matched.extend(g_result["matched_variants"])
        if g == primary_gene:
            primary_diplotype = g_result["diplotype"]
            primary_phenotype = g_phenotype

    # If nothing matched at all, return unknown
    if not all_matched:
        return _build_unknown_response(drug_upper, primary_gene, variants)

    # Use primary gene phenotype for risk; fall back to first found
    if primary_phenotype is None:
        first = next(iter(gene_profiles.values()))
        primary_phenotype = {"phenotype_code": first["phenotype_code"], "phenotype_label": first["phenotype_label"]}

    # ── 6. Compute confidence across ALL matched variants ─────────────
    confidence = compute_confidence(all_matched)

    # ── 7. Assess drug risk ───────────────────────────────────────────
    risk = assess_drug_risk(drug_upper, primary_phenotype["phenotype_code"], confidence)

    # ── 8. LLM explanation ────────────────────────────────────────────
    genes_str = ", ".join(all_genes)
    explanation = generate_explanation(
        drug=drug_upper,
        gene=genes_str,
        diplotype=primary_diplotype,
        phenotype=primary_phenotype["phenotype_label"],
        risk_label=risk["risk_label"],
        variants=all_matched,
    )

    # Build per-gene profiles for response
    gene_profiles_out = [
        {
            "gene":       g,
            "diplotype":  gp["diplotype"],
            "phenotype":  gp["phenotype_code"],
            "variants": [
                {
                    "rsid":                  v["rsid"],
                    "gene":                  v["gene"],
                    "star_allele":           v.get("star_allele"),
                    "genotype":              v["genotype"],
                    "clinical_significance": v.get("clinical_significance"),
                }
                for v in gp["matched_variants"]
            ],
        }
        for g, gp in gene_profiles.items()
    ]

    return {
        "patient_id": f"PATIENT_{uuid.uuid4().hex[:6].upper()}",
        "drug":        drug_upper,
        "timestamp":   datetime.utcnow().isoformat() + "Z",
        "risk_assessment": {
            "risk_label":       risk["risk_label"],
            "confidence_score": risk["confidence_score"],
            "severity":         risk["severity"],
        },
        "pharmacogenomic_profile": {
            "primary_gene":  primary_gene,
            "all_genes":     all_genes,
            "diplotype":     primary_diplotype,
            "phenotype":     primary_phenotype["phenotype_code"],
            "gene_profiles": gene_profiles_out,
            "detected_variants": [
                {
                    "rsid":                  v["rsid"],
                    "gene":                  v["gene"],
                    "star_allele":           v.get("star_allele"),
                    "genotype":              v["genotype"],
                    "clinical_significance": v.get("clinical_significance"),
                }
                for v in all_matched
            ],
        },
        "clinical_recommendation": {
            "action":            risk.get("action"),
            "dosing_adjustment": risk.get("dosing_adjustment"),
            "alternative_drugs": risk.get("alternatives", []),
            "monitoring":        risk.get("monitoring"),
            "cpic_guideline":    risk.get("cpic_guideline"),
        },
        "llm_generated_explanation": explanation,
        "quality_metrics": {
            "vcf_parsing_success": True,
            "variants_detected":   len(variants),
            "gene_coverage":       get_gene_coverage(variants),
            "confidence_basis":    "Dynamic: QUAL + DP + FILTER + CLINSIG weighted scoring",
        },
    }


def _build_unknown_response(drug: str, gene: str, variants: list) -> dict:
    return {
        "patient_id": f"PATIENT_{uuid.uuid4().hex[:6].upper()}",
        "drug":        drug,
        "timestamp":   datetime.utcnow().isoformat() + "Z",
        "risk_assessment": {
            "risk_label":       "Unknown",
            "confidence_score": 0.0,
            "severity":         "none",
        },
        "pharmacogenomic_profile": {
            "primary_gene":      gene,
            "diplotype":         "Unknown",
            "phenotype":         "Unknown",
            "detected_variants": [],
        },
        "clinical_recommendation": {
            "action":            f"No {gene} variants detected in this VCF file. Cannot determine {drug} risk.",
            "dosing_adjustment": None,
            "alternative_drugs": [],
            "monitoring":        "Standard clinical monitoring recommended.",
            "cpic_guideline":    None,
        },
        "llm_generated_explanation": {
            "summary":           f"No pharmacogenomically relevant {gene} variants were identified in the uploaded VCF.",
            "mechanism":         f"Without {gene} variant data, metabolizer status for {drug} cannot be determined.",
            "variant_citations": [],
        },
        "quality_metrics": {
            "vcf_parsing_success": True,
            "variants_detected":   len(variants),
            "gene_coverage":       get_gene_coverage(variants),
            "confidence_basis":    f"No {gene} variants detected in VCF",
        },
    }