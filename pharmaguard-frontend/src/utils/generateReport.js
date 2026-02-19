/**
 * PharmaGuard · Report Generator
 * Generates a professional PDF report from analysis results
 * Uses jsPDF (loaded via CDN) — no backend required
 *
 * Install: npm install jspdf
 * Or load via CDN in index.html:
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 */

import { jsPDF } from 'jspdf'

// ── Colour palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary:    [0,   188, 212],   // cyan
  dark:       [10,  12,  16],    // bg-gray-950
  surface:    [17,  19,  26],    // bg-gray-900
  border:     [55,  65,  81],    // gray-700
  text:       [226, 232, 240],   // gray-200
  subtext:    [156, 163, 175],   // gray-400
  safe:       [34,  197, 94],    // green-500
  adjust:     [234, 179, 8],     // yellow-500
  toxic:      [239, 68,  68],    // red-500
  ineffective:[249, 115, 22],    // orange-500
  unknown:    [107, 114, 128],   // gray-500
}

const RISK_COLORS = {
  'Safe':          COLORS.safe,
  'Adjust Dosage': COLORS.adjust,
  'Toxic':         COLORS.toxic,
  'Ineffective':   COLORS.ineffective,
  'Unknown':       COLORS.unknown,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setFill(doc, rgb)   { doc.setFillColor(...rgb) }
function setDraw(doc, rgb)   { doc.setDrawColor(...rgb) }
function setFont(doc, rgb)   { doc.setTextColor(...rgb) }

function header(doc, fileName) {
  const W = doc.internal.pageSize.getWidth()

  // Dark header bar
  setFill(doc, COLORS.dark)
  doc.rect(0, 0, W, 28, 'F')

  // Cyan accent line
  setFill(doc, COLORS.primary)
  doc.rect(0, 28, W, 1.5, 'F')

  // Logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  setFont(doc, COLORS.primary)
  doc.text('PharmaGuard', 14, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setFont(doc, COLORS.subtext)
  doc.text('Pharmacogenomic Risk Analysis Report', 14, 19)
  doc.text(`File: ${fileName || 'Unknown'}`, 14, 24)

  // Timestamp top right
  doc.setFontSize(7)
  doc.text(new Date().toLocaleString(), W - 14, 24, { align: 'right' })

  return 38 // y after header
}

function footer(doc, pageNum, total) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  setFill(doc, COLORS.border)
  doc.rect(0, H - 12, W, 12, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  setFont(doc, COLORS.subtext)
  doc.text('PharmaGuard · RIFT 2026 · For clinical use only', 14, H - 4.5)
  doc.text(`Page ${pageNum} of ${total}`, W - 14, H - 4.5, { align: 'right' })
}

function sectionTitle(doc, text, y) {
  const W = doc.internal.pageSize.getWidth()
  setFill(doc, [30, 35, 48])
  doc.rect(14, y, W - 28, 8, 'F')

  setFill(doc, COLORS.primary)
  doc.rect(14, y, 3, 8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setFont(doc, COLORS.primary)
  doc.text(text.toUpperCase(), 21, y + 5.5)
  return y + 13
}

function labelValue(doc, label, value, y, x = 14) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setFont(doc, COLORS.subtext)
  doc.text(label + ':', x, y)

  doc.setFont('helvetica', 'normal')
  setFont(doc, COLORS.text)
  doc.text(String(value ?? '—'), x + 42, y)
  return y + 6
}

function riskBadge(doc, label, x, y) {
  const color = RISK_COLORS[label] || COLORS.unknown
  const W = doc.getTextWidth(label) + 10

  setFill(doc, color.map(c => Math.min(255, c * 0.25 + 10)))
  setDraw(doc, color)
  doc.roundedRect(x, y - 4.5, W, 7, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setFont(doc, color)
  doc.text(label, x + 5, y)
}

function confidenceBar(doc, score, x, y, w = 120) {
  const pct = Math.round(score * 100)
  const color = pct >= 85 ? COLORS.safe : pct >= 65 ? [132,204,22] : pct >= 50 ? COLORS.adjust : pct >= 35 ? COLORS.ineffective : COLORS.toxic

  // Track
  setFill(doc, COLORS.border)
  doc.roundedRect(x, y - 3, w, 4, 1, 1, 'F')

  // Fill
  setFill(doc, color)
  doc.roundedRect(x, y - 3, w * (pct / 100), 4, 1, 1, 'F')

  // Label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setFont(doc, color)
  doc.text(`${pct}%`, x + w + 4, y)
}

function wrappedText(doc, text, x, y, maxW, lineH = 5) {
  const lines = doc.splitTextToSize(text, maxW)
  setFont(doc, COLORS.subtext)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(lines, x, y)
  return y + lines.length * lineH
}

function checkPageBreak(doc, y, margin = 30) {
  const H = doc.internal.pageSize.getHeight()
  if (y > H - margin) {
    doc.addPage()
    return true
  }
  return false
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function generateReport(results, fileName) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  const contentW = W - 28

  // ── Page 1: Cover + Summary ───────────────────────────────────────────────
  let y = header(doc, fileName)

  // Summary table header
  y = sectionTitle(doc, 'Analysis Summary', y)

  results.forEach((r, i) => {
    const conf = r.risk_assessment.confidence_score
    const pct  = Math.round(conf * 100)

    // Row background
    setFill(doc, i % 2 === 0 ? [20, 24, 33] : COLORS.surface)
    doc.rect(14, y - 1, contentW, 14, 'F')

    // Drug name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    setFont(doc, COLORS.text)
    doc.text(r.drug, 18, y + 4)

    // Gene
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setFont(doc, COLORS.subtext)
    doc.text(r.pharmacogenomic_profile.primary_gene, 60, y + 4)

    // Diplotype
    doc.text(r.pharmacogenomic_profile.diplotype, 90, y + 4)

    // Phenotype
    doc.text(r.pharmacogenomic_profile.phenotype, 120, y + 4)

    // Risk badge
    riskBadge(doc, r.risk_assessment.risk_label, 148, y + 5)

    // Confidence bar
    confidenceBar(doc, conf, 18, y + 11, 80)

    y += 16
    if (checkPageBreak(doc, y)) { y = header(doc, fileName) }
  })

  y += 6

  // ── Detailed sections per drug ────────────────────────────────────────────
  results.forEach((r) => {
    if (checkPageBreak(doc, y, 60)) { y = header(doc, fileName) }

    // Drug title bar
    setFill(doc, COLORS.primary)
    doc.rect(14, y, contentW, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setFont(doc, [0, 0, 0])
    doc.text(`${r.drug}  ·  ${r.pharmacogenomic_profile.primary_gene}`, 18, y + 7)
    y += 16

    // Risk + Confidence row
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setFont(doc, COLORS.subtext)
    doc.text('RISK:', 14, y)
    riskBadge(doc, r.risk_assessment.risk_label, 30, y)

    doc.text('CONFIDENCE:', 100, y)
    confidenceBar(doc, r.risk_assessment.confidence_score, 125, y, 50)
    y += 10

    // Patient info
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    setFont(doc, COLORS.subtext)
    doc.text(`Patient ID: ${r.patient_id}   |   Timestamp: ${new Date(r.timestamp).toLocaleString()}`, 14, y)
    y += 8

    // Pharmacogenomic Profile
    y = sectionTitle(doc, 'Pharmacogenomic Profile', y)
    y = labelValue(doc, 'Gene',       r.pharmacogenomic_profile.primary_gene, y)
    y = labelValue(doc, 'Diplotype',  r.pharmacogenomic_profile.diplotype, y)
    y = labelValue(doc, 'Phenotype',  r.pharmacogenomic_profile.phenotype, y)
    y += 4

    // Detected Variants table
    const variants = r.pharmacogenomic_profile.detected_variants || []
    if (variants.length > 0) {
      y = sectionTitle(doc, 'Detected Variants', y)

      // Table header
      setFill(doc, [30, 35, 48])
      doc.rect(14, y - 2, contentW, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      setFont(doc, COLORS.primary)
      doc.text('rsID',              18,  y + 3.5)
      doc.text('Gene',              55,  y + 3.5)
      doc.text('Star Allele',       85,  y + 3.5)
      doc.text('Genotype',          115, y + 3.5)
      doc.text('Clinical Sig.',     145, y + 3.5)
      y += 9

      variants.forEach((v, vi) => {
        setFill(doc, vi % 2 === 0 ? [18, 22, 30] : COLORS.surface)
        doc.rect(14, y - 2, contentW, 7, 'F')

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        setFont(doc, COLORS.primary)
        doc.text(v.rsid || '—',              18,  y + 3)
        setFont(doc, COLORS.text)
        doc.text(v.gene || '—',              55,  y + 3)
        doc.text(v.star_allele || '—',       85,  y + 3)
        doc.text(v.genotype || '—',          115, y + 3)
        doc.setFontSize(7)
        doc.text(v.clinical_significance || '—', 145, y + 3)
        y += 7
        if (checkPageBreak(doc, y)) { y = header(doc, fileName) }
      })
      y += 4
    }

    // Clinical Recommendation
    if (checkPageBreak(doc, y, 50)) { y = header(doc, fileName) }
    y = sectionTitle(doc, 'Clinical Recommendation', y)

    const rec = r.clinical_recommendation
    if (rec.action) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      setFont(doc, COLORS.text)
      y = wrappedText(doc, rec.action, 14, y, contentW) + 2
    }
    y = labelValue(doc, 'Dosing Adjustment', rec.dosing_adjustment, y)
    y = labelValue(doc, 'Monitoring',        rec.monitoring, y)
    y = labelValue(doc, 'CPIC Guideline',    rec.cpic_guideline, y)

    if (rec.alternative_drugs?.length > 0) {
      y = labelValue(doc, 'Alternatives', rec.alternative_drugs.join(', '), y)
    }
    y += 4

    // AI Explanation
    const exp = r.llm_generated_explanation
    if (exp?.mechanism && !exp.mechanism.includes('LLM explanation unavailable')) {
      if (checkPageBreak(doc, y, 40)) { y = header(doc, fileName) }
      y = sectionTitle(doc, 'AI Clinical Explanation', y)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      y = wrappedText(doc, exp.mechanism, 14, y, contentW, 5) + 4
    }

    // Quality Metrics
    const qm = r.quality_metrics
    if (qm) {
      if (checkPageBreak(doc, y, 30)) { y = header(doc, fileName) }
      y = sectionTitle(doc, 'Quality Metrics', y)
      y = labelValue(doc, 'Variants Detected', qm.variants_detected, y)
      y = labelValue(doc, 'Gene Coverage',     (qm.gene_coverage || []).join(', '), y)
      y = labelValue(doc, 'Confidence Basis',  qm.confidence_basis, y)
      y += 2
    }

    // Divider between drugs
    setFill(doc, COLORS.border)
    doc.rect(14, y, contentW, 0.5, 'F')
    y += 10
  })

  // ── Add footers to all pages ──────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    footer(doc, p, totalPages)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName = (fileName || 'analysis').replace(/\.[^.]+$/, '').replace(/\s+/g, '_')
  const dateStr  = new Date().toISOString().slice(0, 10)
  doc.save(`PharmaGuard_Report_${safeName}_${dateStr}.pdf`)
}