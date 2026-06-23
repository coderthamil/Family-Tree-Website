import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '@/api/client'
import FamilyTree from '@/components/tree/FamilyTree'
import { TreePine, AlertCircle } from 'lucide-react'

export default function SharePage() {
  const { token } = useParams()
  const [treeData, setTreeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    api.get(`/export/share/${token}`, { headers: { Authorization: '' } })
      .then(r => setTreeData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Invalid or expired share link'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Minimal header */}
      <header style={{
        height: 48, background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: '0.5rem',
      }}>
        <TreePine size={18} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Family Tree</span>
        <span className="badge badge-teal" style={{ marginLeft: '0.5rem' }}>Read Only</span>
      </header>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <AlertCircle size={48} style={{ color: 'var(--danger)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        )}
        {treeData && <FamilyTree data={treeData} />}
      </div>
    </div>
  )
}
