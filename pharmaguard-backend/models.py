from pydantic import BaseModel
from typing import List, Optional


class DetectedVariant(BaseModel):
    rsid: str
    gene: str
    star_allele: Optional[str]
    genotype: str
    clinical_significance: Optional[str]


class RiskAssessment(BaseModel):
    risk_label: str  # Safe | Adjust Dosage | Toxic | Ineffective | Unknown
    confidence_score: float
    severity: str    # none | low | moderate | high | critical


class PharmacogenomicProfile(BaseModel):
    primary_gene: str
    diplotype: str
    phenotype: str   # PM | IM | NM | RM | URM | Unknown
    detected_variants: List[DetectedVariant]


class ClinicalRecommendation(BaseModel):
    action: str
    dosing_adjustment: Optional[str]
    alternative_drugs: Optional[List[str]]
    monitoring: Optional[str]
    cpic_guideline: Optional[str]


class LLMExplanation(BaseModel):
    summary: str
    mechanism: str
    variant_citations: List[str]


class QualityMetrics(BaseModel):
    vcf_parsing_success: bool
    variants_detected: int
    gene_coverage: List[str]
    confidence_basis: str


class AnalysisResponse(BaseModel):
    patient_id: str
    drug: str
    timestamp: str
    risk_assessment: RiskAssessment
    pharmacogenomic_profile: PharmacogenomicProfile
    clinical_recommendation: ClinicalRecommendation
    llm_generated_explanation: LLMExplanation
    quality_metrics: QualityMetrics
