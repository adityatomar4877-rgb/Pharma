const RISK_CONFIG = {
  'Safe':         { bg: 'bg-green-900/40',  border: 'border-green-500',  text: 'text-green-300',  dot: 'bg-green-400' },
  'Adjust Dosage':{ bg: 'bg-yellow-900/40', border: 'border-yellow-500', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  'Toxic':        { bg: 'bg-red-900/40',    border: 'border-red-500',    text: 'text-red-300',    dot: 'bg-red-400' },
  'Ineffective':  { bg: 'bg-orange-900/40', border: 'border-orange-500', text: 'text-orange-300', dot: 'bg-orange-400' },
  'Unknown':      { bg: 'bg-gray-800/40',   border: 'border-gray-600',   text: 'text-gray-300',   dot: 'bg-gray-400' },
}

// compact=true → just the coloured dot, no text (used in tab bar)
export default function RiskBadge({ label, compact = false }) {
  const cfg = RISK_CONFIG[label] || RISK_CONFIG['Unknown']

  if (compact) {
    return (
      <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`} title={label} />
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold
                      ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  )
}

export { RISK_CONFIG }