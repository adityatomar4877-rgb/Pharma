# 💊 PharmaGuard — Pharmacogenomic Risk Prediction System

> **RIFT 2026 Hackathon · Pharmacogenomics / Explainable AI Track**  
> A deterministic, AI-assisted clinical decision support tool that analyzes a patient's VCF file and predicts drug response risk based on CPIC-validated pharmacogenomic guidelines.

---

## 🚀 Live Demo

| Service | URL |
|---------|-----|
| **Web Application** | [https://dist-b3w8xkzts-adityatomar4877-rgbs-projects.vercel.app/) |
| **API (Backend)** | [https://pharmaguard-backend-m34dx13l2-adityatomar4877-rgbs-projects.vercel.app) |
---

## 🎥 Video Demonstration

> 📹 **[Watch Demo on LinkedIn](#)** *(2–5 min walkthrough — link will be updated after upload)*  
> Tags: RIFT2026 page | Hashtags: `#RIFT2026` `#PharmaGuard` `#Pharmacogenomics` `#AIinHealthcare`

---

## 🏗 Architecture Overview

```
User uploads VCF + selects drug
        ↓
React Frontend (Vite + Tailwind CSS)
        ↓  POST /analyze
FastAPI Backend (Python 3.9+)
        ↓
VCF Parser (PyVCF3)          ← validates & parses variant data
        ↓
Diplotype Engine             ← deterministic CPIC star allele mapping
        ↓
Phenotype Engine             ← PM / IM / NM / UM / RM inference
        ↓
Drug Risk Engine             ← CPIC rule lookup (never fabricates)
        ↓
LLM Explainer (Groq/GPT)    ← explains result ONLY, never decides
        ↓
JSON Response (exact schema)
```

**Key design principle:** The deterministic engine runs first and produces the clinical result. The LLM is the last step and **only** generates a human-readable explanation. It **never** overrides or fabricates risk data. If no variants are detected, the system returns `"Unknown"`.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Backend** | FastAPI 0.111, Python 3.9+ |
| **VCF Parsing** | PyVCF3 1.0.3 |
| **Data Validation** | Pydantic 2.7 |
| **LLM Integration** | Groq API (LLaMA 3) |
| **Deployment** | Vercel (Frontend + Backend) |
| **Guidelines Source** | CPIC (pharmgkb.org, cpicpgx.org) |

---

## 🧬 Supported Genes & Drugs

| Drug | Primary Gene | Secondary Genes | Risk Outcomes |
|------|-------------|-----------------|---------------|
| **WARFARIN** | CYP2C9 | VKORC1, CYP4F2, GGCX, CALU, CYP2C19, PROS1, F5 | Toxic, Adjust Dosage, Safe, Ineffective |
| **CODEINE** | CYP2D6 | — | Toxic (UM), Ineffective (PM), Adjust, Safe |
| **CLOPIDOGREL** | CYP2C19 | ABCB1 | Ineffective (PM), Adjust (IM), Safe (NM/UM) |
| **SIMVASTATIN** | SLCO1B1 | CYP3A4 | Toxic (Poor), Adjust (Decreased), Safe (NM) |
| **AZATHIOPRINE** | TPMT | NUDT15 | Toxic (PM), Adjust (IM), Safe (NM) |
| **FLUOROURACIL** | DPYD | TYMS | Toxic (PM), Adjust (IM), Safe (NM) |

---

## 💻 Installation & Local Setup

### Prerequisites
- **Node.js** 18+
- **Python** 3.9+
- **Git**

### 1. Clone the Repository
```bash
cd https://github.com/adityatomar4877-rgb/Pharma.git
```

### 2. Backend Setup
```bash
cd pharmag-backend

# Create virtual environment
python -m venv venv
# Activate it:
# Windows:   venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add:
# GROQ_API_KEY=your_groq_api_key_here
# OPENAI_API_KEY=your_openai_key_here  (optional)

# Start the backend server
uvicorn main:app --reload
# API available at: http://localhost:8000
# Swagger UI at:    http://localhost:8000/docs
```

### 3. Frontend Setup
```bash
cd ../pharma-frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local and set:
# VITE_API_URL=http://localhost:8000

# Start the dev server
npm run dev
# App available at: http://localhost:5173
```

---

## 📖 API Documentation

### `GET /`
Health check endpoint.

**Response:**
```json
{"status": "ok", "service": "PharmaGuard API", "version": "1.0.0"}
```

---

### `GET /supported-drugs`
Returns all supported drug names.

**Response:**
```json
{
  "drugs": ["WARFARIN", "CODEINE", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL"]
}
```

---

### `POST /analyze`
Analyzes a VCF file for drug-specific pharmacogenomic risk.

**Request (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| `file` | `.vcf` file | Patient's genetic variant file |
| `drug` | string | Drug name (e.g., `"Warfarin"`) |

**Constraints:** Max file size: 5 MB

**Full Response Schema:**
```json
{
  "patient_id": "abc123-uuid",
  "drug": "WARFARIN",
  "timestamp": "2026-02-20T02:00:00Z",
  "risk_assessment": {
    "risk_label": "Adjust Dosage",
    "confidence_score": 0.88,
    "severity": "medium"
  },
  "pharmacogenomic_profile": {
    "primary_gene": "CYP2C9",
    "diplotype": "*1/*3",
    "phenotype": "Intermediate Metabolizer",
    "detected_variants": [
      {
        "rsid": "rs1057910",
        "gene": "CYP2C9",
        "star_allele": "*3",
        "genotype": "0/1",
        "clinical_significance": "Pathogenic"
      }
    ]
  },
  "clinical_recommendation": {
    "action": "Reduced metabolism — start with lower warfarin dose.",
    "dosing_adjustment": "Reduce by 25–50%",
    "alternative_drugs": [],
    "monitoring": "INR every 2 weeks",
    "cpic_guideline": "CPIC Warfarin 2017"
  },
  "llm_generated_explanation": {
    "summary": "Patient carries one reduced-function CYP2C9 allele...",
    "mechanism": "CYP2C9 is responsible for warfarin metabolism...",
    "variant_citations": ["rs1057910"]
  },
  "quality_metrics": {
    "vcf_parsing_success": true,
    "variants_detected": 3,
    "gene_coverage": ["CYP2C9", "VKORC1"],
    "confidence_basis": "CPIC guideline deterministic mapping"
  }
}
```

**Error Responses:**
| Code | Cause |
|------|-------|
| `400` | Invalid VCF file or unsupported drug |
| `422` | VCF parsing failed |

---

## 🧪 Sample VCF File

A minimal valid VCF file for testing. The `GENE` INFO field is required for pharmacogenomic analysis:

```
##fileformat=VCFv4.2
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene name">
##INFO=<ID=CLINSIG,Number=1,Type=String,Description="Clinical Significance">
##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">
#CHROM  POS       ID          REF  ALT  QUAL  FILTER  INFO                                        FORMAT   SAMPLE1
chr10   94981296  rs1799853   C    T    99    PASS    DP=150;AF=0.5;GENE=CYP2C9;CLINSIG=Pathogenic  GT:DP    0/1:150
chr10   94942290  rs1057910   A    C    95    PASS    DP=140;AF=0.5;GENE=CYP2C9;CLINSIG=Pathogenic  GT:DP    0/1:140
```

> **Note:** Sample `.vcf` files are included in `pharmaguard-backend/sample_test.vcf`.

---

## 🚢 Deployment Instructions

### Backend → Vercel
```bash
cd pharmag-backend
vercel deploy --prod --yes
# Set GROQ_API_KEY via: vercel env add GROQ_API_KEY production
```

### Frontend → Vercel
```bash
cd pharmaguard-frontend
# Edit .env.local: VITE_API_URL=https://pharma-backend.vercel.app
npm run build
vercel deploy dist --prod --yes
```

---

## 👥 Team

| Name | Role |
|------|------|
| **Aditya Tomar** | Full Stack & Deployment |
| **[Pratyksh Singh Parmar]** | Backend & Bioinformatics |
| **[Ashwin Chauhan]** | Frontend & UI Design |
| **[Priyansh Bhadoriya]** | AI/ML & LLM Integration |

---

## 📚 References

- [CPIC Guidelines](https://cpicpgx.org/)
- [PharmGKB](https://www.pharmgkb.org/)
- [PyVCF3 Documentation](https://pypi.org/project/PyVCF3/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Groq API](https://console.groq.com/)

---

## 📝 License

This project is open-source and available under the **MIT License**.
