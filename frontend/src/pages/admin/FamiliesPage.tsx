import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '@/api/client'
import { Plus, Search, ChevronRight, Users } from 'lucide-react'

interface FamilySummary {
  id: string
  husband_id: string | null
  wife_id: string | null
  member_count: number
}

export default function FamiliesPage() {
  const [families, setFamilies] = useState<FamilySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/families/?limit=200')
    setFamilies(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = families.filter(f =>
    f.id.toLowerCase().includes(search.toLowerCase()) ||
    (f.husband_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.wife_id || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '2rem' }} className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 style={{ margin: 0 }}>Families</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {families.length} family records in the database
          </p>
        </div>
        <Link to="/admin/persons/new" className="btn btn-primary">
          <Plus size={16} /> Add Person
        </Link>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: 360 }}>
        <Search size={16} style={{
          position: 'absolute', left: '0.75rem', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-muted)',
        }} />
        <input
          className="input"
          style={{ paddingLeft: '2.25rem' }}
          placeholder="Search by family ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: 48, height: 48 }} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Family ID</th>
                <th>Husband</th>
                <th>Wife</th>
                <th>Members</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}>
                  <td>
                    <span className="badge badge-cyan">{f.id}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{f.husband_id || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{f.wife_id || '—'}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <Users size={14} /> {f.member_count}
                    </span>
                  </td>
                  <td>
                    <Link to={`/admin/families/${f.id}`} className="btn btn-ghost btn-sm">
                      View <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No families found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
