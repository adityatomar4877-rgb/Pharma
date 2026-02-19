import { useState } from 'react'
import RiskBadge, { RISK_CONFIG } from './RiskBadge'
import JsonViewer from './JsonViewer'

function Section({ title, children, defaultOpen = true, badge = null }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-cyan-400 font-semibold">{title}</h3>
          {badge}
        </div>
        <span className="text-gray-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-white text-sm font-mono text-right max-w-xs">{value || '—'}</span>
    </div>
  )
}

function GeneBadge({ gene, primary = false }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border
      ${primary
        ? 'text-cyan-300 bg-cyan-900/30 border-cyan-700'
        : 'text-violet-300 bg-violet-900/20 border-violet-800'}`}>
      {gene}{primary && <span className="text-cyan-500 text-[10px]">★ primary</span>}
    </span>
  )
}

function VariantTable({ variants }) {
  if (!variants || variants.length === 0) return (
    <p className="text-gray-600 text-sm italic">No variants detected for this gene.</p>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-700">
            <th className="text-left pb-2 pr-4">rsID</th>
            <th className="text-left pb-2 pr-4">Star Allele</th>
            <th className="text-left pb-2 pr-4">Genotype</th>
            <th className="text-left pb-2">Significance</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => (
            <tr key={i} className="border-b border-gray-800 last:border-0">
              <td className="py-2 pr-4 font-mono text-cyan-300">{v.rsid}</td>
              <td className="py-2 pr-4 font-mono text-yellow-300">{v.star_allele || '—'}</td>
              <td className="py-2 pr-4 font-mono text-gray-300">{v.genotype}</td>
              <td className="py-2 text-gray-400">{v.clinical_significance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ResultCard({ data }) {
  const {
    risk_assessment, pharmacogenomic_profile, clinical_recommendation,
    llm_generated_explanation, quality_metrics, patient_id, drug, timestamp
  } = data

  const cfg        = RISK_CONFIG[risk_assessment.risk_label] || RISK_CONFIG['Unknown']
  const confidence = Math.round(risk_assessment.confidence_score * 100)

  // Multi-gene support — use gene_profiles if available, else fall back to single gene
  const geneProfiles  = pharmacogenomic_profile.gene_profiles || null
  const allGenes      = pharmacogenomic_profile.all_genes || [pharmacogenomic_profile.primary_gene]
  const primaryGene   = pharmacogenomic_profile.primary_gene
  const allVariants   = pharmacogenomic_profile.detected_variants || []

  return (
    <div className="mt-8 space-y-4">

      {/* ── Risk Banner ─────────────────────────────────────── */}
      <div className={`border-2 rounded-xl p-6 ${cfg.bg} ${cfg.border}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <RiskBadge label={risk_assessment.risk_label} />
              <span className="text-gray-400 text-sm">{drug} · {patient_id}</span>
            </div>
            <p className={`text-lg font-medium ${cfg.text} mb-3`}>
              {clinical_recommendation.action}
            </p>
            {/* All genes involved */}
            <div className="flex gap-1.5 flex-wrap">
              {allGenes.map(g => (
                <GeneBadge key={g} gene={g} primary={g === primaryGene} />
              ))}
            </div>
          </div>
          <div className="text-right ml-4 shrink-0">
            <p className="text-gray-400 text-xs">Confidence</p>
            <p className={`text-4xl font-bold ${cfg.text}`}>{confidence}%</p>
            <p className="text-gray-500 text-xs capitalize">{risk_assessment.severity} severity</p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-black/30 rounded-full overflow-hidden">
          <div className={`h-2 rounded-full transition-all duration-700 ${cfg.dot}`}
            style={{ width: `${confidence}%` }} />
        </div>
        <p className="text-gray-500 text-xs mt-2 text-right">
          {new Date(timestamp).toLocaleString()}
        </p>
      </div>

      {/* ── Profile + Recommendation ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Pharmacogenomic Profile">
          <Row label="Primary Gene" value={primaryGene} />
          <Row label="All Genes"    value={allGenes.join(', ')} />
          <Row label="Diplotype"    value={pharmacogenomic_profile.diplotype} />
          <Row label="Phenotype"    value={pharmacogenomic_profile.phenotype} />
          <Row label="Total Variants Found" value={String(allVariants.length)} />
        </Section>

        <Section title="Clinical Recommendation">
          <Row label="Dosing Adjustment" value={clinical_recommendation.dosing_adjustment} />
          <Row label="Monitoring"        value={clinical_recommendation.monitoring} />
          <Row label="Alternatives"      value={clinical_recommendation.alternative_drugs?.join(', ')} />
          <Row label="CPIC Guideline"    value={clinical_recommendation.cpic_guideline} />
        </Section>
      </div>

      {/* ── Per-Gene Sections ─────────────────────────────────── */}
      {geneProfiles && geneProfiles.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-sm uppercase tracking-widest px-1">
            Gene-by-Gene Breakdown
          </h3>
          {geneProfiles.map((gp, i) => (
            <Section
              key={gp.gene}
              title={gp.gene}
              defaultOpen={i === 0}
              badge={
                <div className="flex items-center gap-2">
                  <GeneBadge gene={gp.gene} primary={gp.gene === primaryGene} />
                  <span className="text-xs text-gray-500 font-mono">{gp.diplotype}</span>
                  <span className="text-xs text-gray-600 font-mono">·</span>
                  <span className="text-xs text-gray-400 font-mono">{gp.phenotype}</span>
                </div>
              }
            >
              {/* Gene summary row */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Diplotype</p>
                  <p className="text-white font-mono text-sm">{gp.diplotype}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Phenotype</p>
                  <p className="text-white font-mono text-sm">{gp.phenotype}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">
                Variants ({gp.variants?.length || 0})
              </p>
              <VariantTable variants={gp.variants} />
            </Section>
          ))}
        </div>
      ) : (
        /* Fallback — flat table for single-gene results */
        allVariants.length > 0 && (
          <Section title="Detected Variants">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="text-left pb-2 pr-4">rsID</th>
                    <th className="text-left pb-2 pr-4">Gene</th>
                    <th className="text-left pb-2 pr-4">Star Allele</th>
                    <th className="text-left pb-2 pr-4">Genotype</th>
                    <th className="text-left pb-2">Significance</th>
                  </tr>
                </thead>
                <tbody>
                  {allVariants.map((v, i) => (
                    <tr key={i} className="border-b border-gray-800 last:border-0">
                      <td className="py-2 pr-4 font-mono text-cyan-300">{v.rsid}</td>
                      <td className="py-2 pr-4 text-white">{v.gene}</td>
                      <td className="py-2 pr-4 font-mono text-yellow-300">{v.star_allele || '—'}</td>
                      <td className="py-2 pr-4 font-mono text-gray-300">{v.genotype}</td>
                      <td className="py-2 text-gray-400">{v.clinical_significance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )
      )}

      {/* ── AI Explanation ─────────────────────────────────────── */}
      <Section title="AI Analysis Explanation">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          {llm_generated_explanation.summary}
        </p>
        {llm_generated_explanation.mechanism !== llm_generated_explanation.summary && (
          <p className="text-gray-400 text-sm leading-relaxed">
            {llm_generated_explanation.mechanism}
          </p>
        )}
      </Section>

      {/* ── Quality Metrics ────────────────────────────────────── */}
      <Section title="Quality Metrics" defaultOpen={false}>
        <Row label="VCF Parsing"       value={quality_metrics.vcf_parsing_success ? '✓ Success' : '✗ Failed'} />
        <Row label="Variants Detected" value={String(quality_metrics.variants_detected)} />
        <Row label="Gene Coverage"     value={quality_metrics.gene_coverage?.join(', ') || 'None'} />
        <Row label="Confidence Basis"  value={quality_metrics.confidence_basis} />
      </Section>

      {/* ── JSON Output ────────────────────────────────────────── */}
      <JsonViewer data={data} />
    </div>
  )
}
