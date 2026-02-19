import { useRef, useState } from 'react'

export default function FileUpload({ onFileSelect }) {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const validate = (file) => {
    if (!file) return 'No file selected.'
    if (!file.name.endsWith('.vcf')) return 'Only .vcf files are accepted.'
    if (file.size > 5 * 1024 * 1024) return 'File must be under 5MB.'
    return null
  }

  const handleFile = (file) => {
    const err = validate(file)
    if (err) {
      setError(err)
      setFileName(null)
      onFileSelect(null)
      return
    }
    setError(null)
    setFileName(file.name)
    onFileSelect(file)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">
        VCF File Upload
      </label>
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files[0])
        }}
        className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${dragging
            ? 'border-cyan-400 bg-cyan-900/20'
            : fileName
            ? 'border-green-500 bg-green-900/10'
            : 'border-gray-700 hover:border-gray-500 bg-gray-900/40'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".vcf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {fileName ? (
          <div>
            <div className="text-green-400 text-2xl mb-2">✓</div>
            <p className="text-green-300 font-medium">{fileName}</p>
            <p className="text-gray-500 text-xs mt-1">Click to change file</p>
          </div>
        ) : (
          <div>
            <div className="text-gray-500 text-3xl mb-3">📁</div>
            <p className="text-gray-300">Drag & drop your .vcf file here</p>
            <p className="text-gray-500 text-sm mt-1">or click to browse</p>
            <p className="text-gray-600 text-xs mt-3">VCF v4.2 • Max 5MB</p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
