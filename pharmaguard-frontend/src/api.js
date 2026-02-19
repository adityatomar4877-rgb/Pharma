const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function analyzeVCF(file, drug) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('drug', drug)

  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }))
    throw new Error(err.detail || 'Analysis failed')
  }

  return res.json()
}

export async function getSupportedDrugs() {
  const res = await fetch(`${BASE_URL}/supported-drugs`)
  const data = await res.json()
  return data.drugs || []
}
