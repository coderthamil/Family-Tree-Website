import { useEffect, useState } from 'react'
import api from '@/api/client'
import { Users, TreePine, Image, ImageOff } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Stats {
  person_count: number
  family_count: number
  persons_with_photo: number
  persons_without_photo: number
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="stat-card">
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '0.5rem',
      }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="stat-number" style={{ color }}>{value.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
    </div>
  )

  return (
    <div style={{ padding: '2rem' }} className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Overview of your family tree database
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/import" className="btn btn-primary">
            Import Data
          </Link>
          <Link to="/tree" className="btn btn-secondary">
            View Tree
          </Link>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard icon={Users} label="Total Persons" value={stats.person_count} color="#00A7E1" />
            <StatCard icon={TreePine} label="Total Families" value={stats.family_count} color="#007EA7" />
            <StatCard icon={Image} label="With Photo" value={stats.persons_with_photo} color="#22c55e" />
            <StatCard icon={ImageOff} label="Without Photo" value={stats.persons_without_photo} color="#f59e0b" />
          </div>

          {/* Photo coverage bar */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>Profile Photo Coverage</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>{stats.persons_with_photo} with photos</span>
              <span>{stats.person_count > 0 ? Math.round((stats.persons_with_photo / stats.person_count) * 100) : 0}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${stats.person_count > 0 ? (stats.persons_with_photo / stats.person_count) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <Link to="/admin/families" style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Manage Families</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  View, add, edit and delete family records
                </p>
              </Link>
            </div>
            <div className="card" style={{ cursor: 'pointer' }}>
              <Link to="/admin/import" style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Import GenoPro File</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Upload .htm or .xml files from GenoPro
                </p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
