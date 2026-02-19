import { useState } from 'react'

export default function JsonViewer({ data }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  const copy = () => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pharmaguard_${data.patient_id}_${data.drug}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex justify-between items-center px-5 py-4">
        <button
          onClick={() => setOpen(!open)}
          className="text-cyan-400 font-semibold text-sm flex items-center gap-2"
        >
          <span>{open ? '▲' : '▼'}</span>
          Raw JSON Output
        </button>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button
            onClick={download}
            className="text-xs bg-cyan-800 hover:bg-cyan-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            ⬇ Download JSON
          </button>
        </div>
      </div>
      {open && (
        <pre className="text-xs text-green-300 overflow-auto max-h-96 bg-black p-5 leading-relaxed">
          {json}
        </pre>
      )}
    </div>
  )
}
