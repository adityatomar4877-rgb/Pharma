import os
import httpx
from typing import List, Dict

# ── Lazy client — initialized on first API call, not at import time ──────────
_client = None

def _get_client():
    global _client
    if _client is not None:
        return _client
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return None
        # Set explicit timeout to avoid Vercel serverless function timeouts
        _client = Groq(api_key=api_key, http_client=httpx.Client(timeout=8.0))
        return _client
    except ImportError:
        return None


def generate_explanation(
    drug: str,
    gene: str,
    diplotype: str,
    phenotype: str,
    risk_label: str,
    variants: List[Dict],
) -> Dict:
    """
    LLM acts as explainer ONLY — it explains what the deterministic
    engine already found. It never makes clinical decisions.
    """
    variant_list = ", ".join([v["rsid"] for v in variants]) if variants else "none detected"

    prompt = f"""You are a clinical pharmacogenomics assistant providing explanations for clinicians.

The deterministic analysis system has already produced this result:
- Drug: {drug}
- Gene: {gene}
- Diplotype: {diplotype}
- Phenotype: {phenotype}
- Risk Assessment: {risk_label}
- Detected Variants: {variant_list}

Your task is to explain this result. Provide:
1. A concise 2-sentence clinical summary
2. The biological mechanism (how this genotype affects drug metabolism)
3. Reference each detected variant and its known functional impact

Rules:
- Do NOT recommend doses or actions — that is already determined
- Do NOT fabricate variants or genotypes not listed above
- If diplotype is *1/*1 or Unknown, state clearly no actionable variants were found
- Be factual and precise
- Write for a clinical audience"""

    client = _get_client()
    if client:
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.1,
            )
            text = response.choices[0].message.content.strip()
            lines = text.split("\n")
            summary = " ".join(lines[:2]) if len(lines) >= 2 else text[:300]
            return {
                "summary":           summary,
                "mechanism":         text,
                "variant_citations": [v["rsid"] for v in variants],
            }
        except Exception as e:
            return _fallback_explanation(drug, gene, diplotype, phenotype, variants, str(e))
    else:
        return _fallback_explanation(drug, gene, diplotype, phenotype, variants, "No GROQ_API_KEY configured")


def _fallback_explanation(
    drug: str,
    gene: str,
    diplotype: str,
    phenotype: str,
    variants: List[Dict],
    reason: str,
) -> Dict:
    """
    Rule-based fallback explanation when LLM is unavailable.
    Always accurate — derived from deterministic results only.
    """
    variant_list = ", ".join([v["rsid"] for v in variants]) if variants else "no variants detected"

    summary = (
        f"Patient carries {gene} diplotype {diplotype}, resulting in {phenotype} status. "
        f"This affects {drug} metabolism as indicated by the risk assessment."
    )

    mechanism = (
        f"{gene} encodes a key metabolic enzyme. "
        f"The {diplotype} diplotype (detected variants: {variant_list}) "
        f"alters enzyme activity, leading to {phenotype} metabolizer status. "
        f"This directly impacts {drug} pharmacokinetics and clinical response. "
        f"[Note: Detailed LLM explanation unavailable — {reason}]"
    )

    return {
        "summary":           summary,
        "mechanism":         mechanism,
        "variant_citations": [v["rsid"] for v in variants],
    }