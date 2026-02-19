import { useState, useEffect } from 'react'
import { loadAnalyses, deleteAnalysis, DRUG_GENE_MAP } from './utils/analysisLogger'
import { generateReport } from './utils/generateReport'

const RISK_COLORS = {
  'Safe':          { text: 'text-green-400',  bg: 'bg-green-900/30',  border: 'border-green-700',  dot: 'bg-green-400',  bar: 'bg-green-500' },
  'Adjust Dosage': { text: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-700', dot: 'bg-yellow-400', bar: 'bg-yellow-500' },
  'Toxic':         { text: 'text-red-400',    bg: 'bg-red-900/30',    border: 'border-red-700',    dot: 'bg-red-400',    bar: 'bg-red-500' },
  'Ineffective':   { text: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-700', dot: 'bg-orange-400', bar: 'bg-orange-500' },
  'Unknown':       { text: 'text-gray-400',   bg: 'bg-gray-800/30',   border: 'border-gray-700',   dot: 'bg-gray-500',   bar: 'bg-gray-500' },
}

// All genes tracked across all drugs
const ALL_GENES = [...new Set(Object.values(DRUG_GENE_MAP).flat())]

function RiskDot({ label }) {
  const c = RISK_COLORS[label] || RISK_COLORS['Unknown']
  return <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} title={label} />
}

function RiskPill({ label }) {
  const c = RISK_COLORS[label] || RISK_COLORS['Unknown']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${c.text} ${c.bg} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${accent}`} />
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 pl-1">{label}</p>
      <p className="text-3xl font-bold text-white font-mono pl-1">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1 pl-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard({ user, onNewAnalysis, onLogout }) {
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [filter, setFilter]     = useState('ALL')
  const [geneFilter, setGeneFilter] = useState('ALL')
  const [search, setSearch]     = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => { fetchHistory() }, [])

  async function fetchHistory() {
    setLoading(true)
    setSaveError('')
    try {
      const data = await loadAnalyses(user.uid)
      setHistory(data)
    } catch (e) {
      console.error('Failed to load history:', e)
      setSaveError('Failed to load history. Check Firestore rules.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await deleteAnalysis(user.uid, id)
      setHistory(prev => prev.filter(h => h.id !== id))
      if (expanded === id) setExpanded(null)
    } catch (e) {
      setSaveError('Failed to delete. Check Firestore rules.')
    } finally {
      setDeleting(null)
    }
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const allResults    = history.flatMap(h => h.results || [])
  const totalAnalyses = history.length
  const totalDrugs    = history.reduce((s, h) => s + (h.drugCount || 0), 0)
  const toxicCount    = allResults.filter(r => r.risk_assessment?.risk_label === 'Toxic').length
  const avgConf       = allResults.length
    ? allResults.reduce((s, r) => s + (r.risk_assessment?.confidence_score || 0), 0) / allResults.length
    : 0

  const riskCounts = allResults.reduce((acc, r) => {
    const label = r.risk_assessment?.risk_label || 'Unknown'
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})

  const drugFreq = allResults.reduce((acc, r) => {
    acc[r.drug] = (acc[r.drug] || 0) + 1
    return acc
  }, {})
  const topDrugs = Object.entries(drugFreq).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxDrug  = topDrugs[0]?.[1] || 1

  // Gene involvement counts
  const geneFreq = history.flatMap(h => h.genesInvolved || []).reduce((acc, g) => {
    acc[g] = (acc[g] || 0) + 1; return acc
  }, {})

  // ── Filters ───────────────────────────────────────────────────────────────
  const RISK_FILTERS = ['ALL', 'Safe', 'Adjust Dosage', 'Toxic', 'Ineffective', 'Unknown']

  const filtered = history.filter(h => {
    const matchRisk = filter === 'ALL' || h.riskSummary?.includes(filter)
    const matchGene = geneFilter === 'ALL' || (h.genesInvolved || []).includes(geneFilter)
    const matchSearch = !search ||
      h.vcfFileName?.toLowerCase().includes(search.toLowerCase()) ||
      h.drugsSummary?.toLowerCase().includes(search.toLowerCase())
    return matchRisk && matchGene && matchSearch
  })

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Top bar */}
      <div className="border-b border-gray-800 bg-gray-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-mono text-sm font-bold tracking-wider">PharmaGuard</span>
            <span className="text-gray-700 text-xs">·</span>
            <span className="text-gray-400 text-xs">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs hidden sm:block truncate max-w-40">{user.email}</span>
            <button
              onClick={onNewAnalysis}
              className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400
                         text-black text-sm font-bold rounded-lg transition-all"
            >
              + New Analysis
            </button>
            <button
              onClick={onLogout}
              className="text-xs text-gray-600 hover:text-red-400 px-2 py-1.5
                         border border-gray-800 hover:border-red-900 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, <span className="text-cyan-400">{user.displayName || user.email?.split('@')[0]}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Your pharmacogenomic analysis history and predictions</p>
        </div>

        {/* Firestore error */}
        {saveError && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-sm">
            ⚠ {saveError}
            <span className="ml-2 text-xs text-red-500">
              Go to Firebase Console → Firestore → Rules → set read/write to true for testing
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Reports"   value={totalAnalyses}                   sub="all time"             accent="bg-cyan-500" />
          <StatCard label="Drugs Analyzed"  value={totalDrugs}                      sub="across all reports"   accent="bg-blue-500" />
          <StatCard label="Avg Confidence"  value={`${Math.round(avgConf * 100)}%`} sub="across results"       accent="bg-violet-500" />
          <StatCard label="Toxic Findings"  value={toxicCount}                      sub="high risk flags"      accent="bg-red-500" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* History — 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm uppercase tracking-widest">Analysis History</h2>
              <button onClick={fetchHistory} className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">
                ↻ Refresh
              </button>
            </div>

            {/* Search */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by drug or filename…"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2
                         text-sm text-white placeholder-gray-600
                         focus:outline-none focus:border-cyan-500 transition-all"
            />

            {/* Risk filter */}
            <div>
              <p className="text-xs text-gray-600 mb-2 uppercase tracking-wider">Filter by Risk</p>
              <div className="flex gap-1.5 flex-wrap">
                {RISK_FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                      ${filter === f
                        ? 'bg-cyan-500 border-cyan-500 text-black'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Gene filter */}
            <div>
              <p className="text-xs text-gray-600 mb-2 uppercase tracking-wider">Filter by Gene</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setGeneFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                    ${geneFilter === 'ALL' ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  ALL
                </button>
                {ALL_GENES.map(g => (
                  <button key={g} onClick={() => setGeneFilter(g)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all
                      ${geneFilter === g ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-2xl animate-spin text-cyan-500">⟳</span>
                  <p className="text-gray-500 text-sm">Loading history…</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
                <p className="text-4xl mb-3">🧬</p>
                <p className="text-gray-400 font-medium">
                  {history.length === 0 ? 'No analyses found' : 'No matches for current filters'}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {history.length === 0 ? 'Run your first analysis to see results here' : 'Try a different filter'}
                </p>
                {history.length === 0 && (
                  <button onClick={onNewAnalysis}
                    className="mt-4 px-4 py-2 bg-cyan-500 text-black text-sm font-bold rounded-lg hover:bg-cyan-400 transition-all">
                    Start Analysis
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(h => (
                  <div key={h.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all">

                    {/* Row header */}
                    <div className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex gap-1 mt-1 flex-shrink-0">
                          {(h.results || []).map((r, i) => (
                            <RiskDot key={i} label={r.risk_assessment?.risk_label} />
                          ))}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{h.vcfFileName}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{h.drugsSummary} · {h.drugCount} drug{h.drugCount > 1 ? 's' : ''}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {(h.genesInvolved || []).map(g => (
                              <span key={g} className="text-xs font-mono text-violet-400 bg-violet-900/20 border border-violet-800 px-1.5 py-0.5 rounded">
                                {g}
                              </span>
                            ))}
                          </div>
                          <p className="text-gray-700 text-xs mt-1 font-mono">
                            {h.savedAt instanceof Date ? h.savedAt.toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-600 font-mono">
                          {Math.round((h.avgConfidence || 0) * 100)}%
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); generateReport(h.results, h.vcfFileName) }}
                          className="text-xs text-gray-500 hover:text-cyan-400 px-2 py-1 border border-gray-700 hover:border-cyan-700 rounded-lg transition-colors"
                          title="Download PDF">
                          ↓ PDF
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(h.id) }}
                          disabled={deleting === h.id}
                          className="text-xs text-gray-600 hover:text-red-400 px-2 py-1 border border-gray-800 hover:border-red-900 rounded-lg transition-colors disabled:opacity-40"
                          title="Delete">
                          {deleting === h.id ? '…' : '✕'}
                        </button>
                        <span className={`text-gray-500 text-xs transition-transform duration-200 ${expanded === h.id ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expanded === h.id && (
                      <div className="border-t border-gray-800 p-4 space-y-3">
                        {(h.results || []).map((r, i) => {
                          const conf    = Math.round((r.risk_assessment?.confidence_score || 0) * 100)
                          const profile = r.pharmacogenomic_profile
                          const rec     = r.clinical_recommendation
                          // Show all genes for this drug
                          const drugGenes = DRUG_GENE_MAP[r.drug] || [profile?.primary_gene]
                          return (
                            <div key={i} className="bg-gray-800/40 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <span className="text-white font-mono text-sm font-bold">{r.drug}</span>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {drugGenes.map(g => (
                                      <span key={g} className={`text-xs font-mono px-1.5 py-0.5 rounded border
                                        ${g === profile?.primary_gene
                                          ? 'text-cyan-400 bg-cyan-900/20 border-cyan-800'
                                          : 'text-violet-400 bg-violet-900/20 border-violet-800'}`}>
                                        {g}{g === profile?.primary_gene ? ' ★' : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <RiskPill label={r.risk_assessment?.risk_label} />
                                  <span className="text-xs text-gray-500 font-mono">{conf}%</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                                <div>
                                  <p className="text-gray-600 uppercase tracking-wider mb-0.5">Primary Gene</p>
                                  <p className="text-cyan-300 font-mono">{profile?.primary_gene}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 uppercase tracking-wider mb-0.5">Diplotype</p>
                                  <p className="text-gray-300 font-mono">{profile?.diplotype}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 uppercase tracking-wider mb-0.5">Phenotype</p>
                                  <p className="text-gray-300 font-mono">{profile?.phenotype}</p>
                                </div>
                              </div>

                              {/* Variants */}
                              {(profile?.detected_variants || []).length > 0 && (
                                <div className="mb-3">
                                  <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Detected Variants</p>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {profile.detected_variants.map((v, vi) => (
                                      <span key={vi} className="text-xs font-mono text-gray-400 bg-gray-700/40 border border-gray-700 px-2 py-0.5 rounded">
                                        {v.rsid} {v.star_allele ? `(${v.star_allele})` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Clinical action */}
                              {rec?.action && (
                                <div className="border-t border-gray-700 pt-2">
                                  <p className="text-gray-500 text-xs">{rec.action}</p>
                                  {rec.dosing_adjustment && (
                                    <p className="text-yellow-500/70 text-xs mt-1 font-mono">→ {rec.dosing_adjustment}</p>
                                  )}
                                  {rec.monitoring && (
                                    <p className="text-gray-600 text-xs mt-0.5">Monitor: {rec.monitoring}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Risk distribution */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Risk Distribution</h3>
              {Object.keys(riskCounts).length === 0 ? (
                <p className="text-gray-700 text-sm text-center py-6">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(riskCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                    const c     = RISK_COLORS[label] || RISK_COLORS['Unknown']
                    const total = Object.values(riskCounts).reduce((s, v) => s + v, 0)
                    const pct   = Math.round((count / total) * 100)
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={c.text}>{label}</span>
                          <span className="text-gray-500">{count} ({pct}%)</span>
                        </div>
                        <div className="bg-gray-800 rounded-full h-2">
                          <div className={`h-2 rounded-full ${c.bar} transition-all duration-700`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Gene involvement */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Gene Involvement</h3>
              {Object.keys(geneFreq).length === 0 ? (
                <p className="text-gray-700 text-sm text-center py-6">No data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(geneFreq).sort((a, b) => b[1] - a[1]).map(([gene, count]) => {
                    const max = Math.max(...Object.values(geneFreq))
                    return (
                      <div key={gene}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-violet-400 font-mono">{gene}</span>
                          <span className="text-gray-500">{count}×</span>
                        </div>
                        <div className="bg-gray-800 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-violet-500 transition-all duration-700"
                            style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top drugs */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Most Analyzed Drugs</h3>
              {topDrugs.length === 0 ? (
                <p className="text-gray-700 text-sm text-center py-6">No data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {topDrugs.map(([drug, count]) => (
                    <div key={drug}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300 font-mono">{drug}</span>
                        <span className="text-gray-500">{count}×</span>
                      </div>
                      <div className="bg-gray-800 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-cyan-500 transition-all duration-700"
                          style={{ width: `${(count / maxDrug) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Recent Activity</h3>
              {history.length === 0 ? (
                <p className="text-gray-700 text-sm text-center py-6">No activity yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-800" />
                  <div className="space-y-4">
                    {history.slice(0, 6).map((h) => (
                      <div key={h.id} className="flex gap-3 pl-6 relative">
                        <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-gray-800 border-2 border-cyan-900 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-300 text-xs font-medium truncate">{h.drugsSummary}</p>
                          <p className="text-gray-600 text-xs truncate">{h.vcfFileName}</p>
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {(h.genesInvolved || []).slice(0, 3).map(g => (
                              <span key={g} className="text-xs font-mono text-violet-500">{g}</span>
                            ))}
                          </div>
                          <p className="text-gray-700 text-xs font-mono">
                            {h.savedAt instanceof Date ? h.savedAt.toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}