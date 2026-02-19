const DRUGS = [
  'WARFARIN',
  'CODEINE',
  'CLOPIDOGREL',
  'SIMVASTATIN',
  'AZATHIOPRINE',
  'FLUOROURACIL',
]

const DRUG_DESCRIPTIONS = {
  WARFARIN:      'Anticoagulant — CYP2C9',
  CODEINE:       'Opioid analgesic — CYP2D6',
  CLOPIDOGREL:   'Antiplatelet — CYP2C19',
  SIMVASTATIN:   'Statin — SLCO1B1',
  AZATHIOPRINE:  'Immunosuppressant — TPMT',
  FLUOROURACIL:  'Chemotherapy — DPYD',
}

export default function DrugInput({ selected = [], onToggle, onClearAll }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-400">
          Select Drugs
          <span className="ml-2 text-xs text-gray-600">(select one or more)</span>
        </label>
        {selected.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DRUGS.map((drug) => {
          const isSelected = selected.includes(drug)
          return (
            <button
              key={drug}
              type="button"
              onClick={() => onToggle(drug)}
              className={`text-left p-3 rounded-lg border transition-all focus:outline-none group relative
                ${isSelected
                  ? 'border-cyan-500 bg-cyan-900/25 ring-1 ring-cyan-500/40'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/50'
                }`}
            >
              {/* Checkmark badge */}
              <span className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all
                ${isSelected
                  ? 'bg-cyan-500 border-cyan-500 text-black'
                  : 'border-gray-600 text-transparent'
                }`}>
                ✓
              </span>
              <p className={`text-sm font-medium pr-5 transition-colors
                ${isSelected ? 'text-cyan-300' : 'text-white group-hover:text-gray-200'}`}>
                {drug}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {DRUG_DESCRIPTIONS[drug]}
              </p>
            </button>
          )
        })}
      </div>

      {/* Selected pills summary */}
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map(drug => (
            <span
              key={drug}
              className="inline-flex items-center gap-1 bg-cyan-900/40 border border-cyan-700
                         text-cyan-300 text-xs px-2 py-0.5 rounded-full font-mono"
            >
              {drug}
              <button
                onClick={() => onToggle(drug)}
                className="text-cyan-500 hover:text-white ml-0.5 leading-none"
              >×</button>
            </span>
          ))}
          <span className="text-gray-600 text-xs self-center">
            {selected.length} drug{selected.length > 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  )
}