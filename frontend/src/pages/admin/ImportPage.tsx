import { useState, useCallback } from 'react'
import api from '@/api/client'
import toast from 'react-hot-toast'
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react'

interface ImportResult {
  status: string
  filename: string
  stats: {
    persons_added: number
    persons_updated: number
    families_added: number
    families_updated: number
    children_linked: number
  }
}

export default function ImportPage() {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setUploading(true)
    setResult(null)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post('/import/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      toast.success(`Imported ${file.name} successfully!`)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Import failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 680 }} className="animate-fade-in">
      <h1 style={{ marginBottom: '0.25rem' }}>Import GenoPro File</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Upload an <strong>.htm</strong> or <strong>.xml</strong> file exported from GenoPro. All persons and families will be upserted — existing records are updated, new ones are created.
      </p>

      {/* Drop zone */}
      <label
        htmlFor="import-file-input"
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{ display: 'block', cursor: 'pointer' }}
      >
        <input
          id="import-file-input"
          type="file"
          accept=".htm,.html,.xml"
          hidden
          onChange={handleInputChange}
          disabled={uploading}
        />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Parsing and importing data…</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(0,167,225,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={28} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                Drop your GenoPro file here
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                or click to browse • .htm / .xml accepted
              </p>
            </div>
          </div>
        )}
      </label>

      {/* Result */}
      {result && (
        <div className="card" style={{ marginTop: '1.5rem', borderColor: '#22c55e55', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <CheckCircle size={24} style={{ color: '#22c55e', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Import successful</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <FileText size={12} style={{ display: 'inline', marginRight: '0.3rem' }} />
                {result.filename}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Persons Added', value: result.stats.persons_added, color: '#22c55e' },
              { label: 'Persons Updated', value: result.stats.persons_updated, color: '#00A7E1' },
              { label: 'Families Added', value: result.stats.families_added, color: '#22c55e' },
              { label: 'Families Updated', value: result.stats.families_updated, color: '#00A7E1' },
              { label: 'Children Linked', value: result.stats.children_linked, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-secondary)',
                borderRadius: 8, padding: '0.75rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ marginTop: '1.5rem', borderColor: 'var(--danger)55' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <XCircle size={24} style={{ color: 'var(--danger)' }} />
            <div style={{ color: 'var(--danger)' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="card" style={{ marginTop: '1.5rem', background: 'rgba(0,167,225,0.04)' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--accent)' }}>Import Tips</h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li>Export your GenoPro project as <strong>HTML/XML</strong> format</li>
          <li>Existing person/family IDs (e.g. I136, F20) are preserved</li>
          <li>Re-importing the same file is safe — existing records are updated</li>
          <li>Birth/death/marriage timeline events are auto-created on first import</li>
        </ul>
      </div>
    </div>
  )
}
