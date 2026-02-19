import { useState } from 'react'
import { analyzeVCF } from './api'
import DrugInput from './components/DrugInput'
import FileUpload from './components/FileUpload'
import ResultCard from './components/ResultCard'
import RiskBadge from './components/RiskBadge'
import { generateReport } from './utils/generateReport'

export default function AppMain({ user, onLogout, onDashboard, onAnalysisComplete }) {
  const [file, setFile]           = useState(null)
  const [drugs, setDrugs]         = useState([])
  const [results, setResults]     = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [reporting, setReporting] = useState(false)
  const [saved, setSaved]         = useState(false)

  const canAnalyze  = file && drugs.length > 0 && !loading
  const canDownload = results.length > 0 && !loading

  const handleToggle = (drug) => {
    setDrugs(prev =>
      prev.includes(drug) ? prev.filter(d => d !== drug) : [...prev, drug]
    )
    setResults([])
    setError(null)
    setSaved(false)
  }

  const handleClearAll = () => {
    setDrugs([])
    setResults([])
    setError(null)
    setSaved(false)
  }

  const handleAnalyze = async () => {
    if (!canAnalyze) return
    setLoading(true)
    setError(null)
    setResults([])
    setActiveIdx(0)
    setSaved(false)

    const settled = await Promise.allSettled(
      drugs.map(drug => analyzeVCF(file, drug))
    )

    const successes = []
    const failures  = []

    settled.forEach((outcome, idx) => {
      if (outcome.status === 'fulfilled') {
        successes.push(outcome.value)
      } else {
        failures.push(`${drugs[idx]}: ${outcome.reason?.message || 'Failed'}`)
      }
    })

    setResults(successes)

    // Auto-save to Firestore history
    if (successes.length > 0) {
      try {
        await onAnalysisComplete?.(successes, file?.name)
        setSaved(true)
      } catch (e) {
        console.warn('Failed to save to history:', e)
      }
    }

    if (failures.length > 0) {
      setError(`Some analyses failed:\n${failures.join('\n')}`)
    }

    setLoading(false)
  }

  const handleDownloadReport = async () => {
    if (!canDownload) return
    setReporting(true)
    try {
      await generateReport(results, file?.name)
    } catch (e) {
      setError(`Report generation failed: ${e.message}`)
    } finally {
      setReporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-cyan-400">PharmaGuard</h1>
            <p className="text-gray-500 text-xs">Pharmacogenomic Risk Prediction System</p>
          </div>

          <div className="flex items-center gap-2">

            {/* Dashboard button */}
            <button
              onClick={onDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700
                         bg-gray-900 text-gray-300 text-sm font-medium
                         hover:border-gray-500 hover:text-white transition-all"
            >
              ← Dashboard
            </button>

            {/* Download Report — visible only when results exist */}
            {canDownload && (
              <button
                onClick={handleDownloadReport}
                disabled={reporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-700
                           bg-cyan-900/20 text-cyan-300 text-sm font-medium
                           hover:bg-cyan-900/40 hover:border-cyan-500
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {reporting ? (
                  <>
                    <span className="animate-spin text-base">⟳</span>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Download Report
                  </>
                )}
              </button>
            )}

            {/* User info + logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
              <span className="text-gray-500 text-xs hidden sm:block truncate max-w-32">
                {user?.email}
              </span>
              <button
                onClick={onLogout}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1
                           border border-gray-800 hover:border-red-900 rounded-lg"
              >
                Logout
              </button>
            </div>

            <span className="text-xs text-gray-600 border border-gray-700 px-2 py-1 rounded">
              RIFT 2026
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Hero */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            Predict Drug Risk from Genetic Data
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Upload a VCF file and select one or more drugs to get CPIC-aligned
            pharmacogenomic risk predictions with AI-generated clinical explanations.
          </p>
        </div>

        {/* Input Panel */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FileUpload onFileSelect={(f) => { setFile(f); setResults([]); setError(null); setSaved(false) }} />
            <DrugInput
              selected={drugs}
              onToggle={handleToggle}
              onClearAll={handleClearAll}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed
                       text-black font-bold py-3 rounded-xl transition-all text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span>
                Analyzing {drugs.length} drug{drugs.length > 1 ? 's' : ''}…
              </span>
            ) : drugs.length > 1
              ? `Analyze ${drugs.length} Drugs`
              : 'Analyze Pharmacogenomic Risk'
            }
          </button>
        </div>

        {/* Saved to history notice */}
        {saved && (
          <div className="mb-4 p-3 bg-green-950/40 border border-green-800 rounded-xl
                          text-green-400 text-sm flex items-center gap-2">
            <span>✓</span>
            Analysis saved to your history — view it in the Dashboard.
            <button onClick={onDashboard} className="ml-auto text-green-500 hover:text-green-300 underline text-xs">
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-950 border border-red-700 rounded-xl text-red-300 text-sm whitespace-pre-line">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results — single drug */}
        {results.length === 1 && (
          <ResultCard data={results[0]} />
        )}

        {/* Results — multiple drugs */}
        {results.length > 1 && (
          <div className="mt-8">

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {results.map((r, i) => {
                const conf = Math.round(r.risk_assessment.confidence_score * 100)
                return (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`text-left p-3 rounded-xl border transition-all
                      ${i === activeIdx
                        ? 'border-cyan-500 bg-cyan-900/20'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}
                  >
                    <p className="text-xs text-gray-500 mb-1">{r.drug}</p>
                    <RiskBadge label={r.risk_assessment.risk_label} />
                    <p className="text-gray-400 text-xs mt-1">{conf}% confidence</p>
                  </button>
                )
              })}
            </div>

            {/* Tab bar */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all
                    ${i === activeIdx
                      ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                    }`}
                >
                  {r.drug}
                  <RiskBadge label={r.risk_assessment.risk_label} compact />
                </button>
              ))}
            </div>

            {/* Active result detail */}
            <ResultCard data={results[activeIdx]} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-700 text-xs">
          PharmaGuard · RIFT 2026 Hackathon · Pharmacogenomics / Explainable AI Track
        </footer>
      </main>
    </div>
  )
}