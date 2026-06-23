import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '@/api/client'
import { ArrowLeft, Plus } from 'lucide-react'
import PersonAvatar from '@/components/ui/PersonAvatar'

interface PersonSummary {
  id: string; first_name: string; last_name: string;
  dob: string | null; gender: string; profile_pic_url: string | null
}
interface FamilyDetail {
  id: string
  husband_id: string | null; wife_id: string | null
  marriage_date: string | null; marriage_place: string | null
  husband: PersonSummary | null; wife: PersonSummary | null
  children: PersonSummary[]
}

function PersonCard({ person }: { person: PersonSummary }) {
  return (
    <Link to={`/admin/persons/${person.id}/edit`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        cursor: 'pointer', transition: 'all 0.2s',
        borderColor: person.gender === 'male' ? '#007EA755' : '#e18ec455',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = person.gender === 'male' ? '#007EA755' : '#e18ec455')}
      >
        <PersonAvatar person={person} size={48} />
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {person.first_name} {person.last_name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {person.id} {person.dob ? `• b. ${person.dob}` : ''}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function FamilyDetailPage() {
  const { familyId } = useParams()
  const [family, setFamily] = useState<FamilyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/families/${familyId}`)
      .then(r => setFamily(r.data))
      .finally(() => setLoading(false))
  }, [familyId])

  if (loading) return (
    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
    </div>
  )

  if (!family) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Family not found.</div>

  return (
    <div style={{ padding: '2rem' }} className="animate-fade-in">
      <Link to="/admin/families" className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Families
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Family <span className="badge badge-cyan" style={{ fontSize: '1.25rem' }}>{family.id}</span></h1>
          {family.marriage_date && (
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Married: {family.marriage_date} {family.marriage_place ? `• ${family.marriage_place}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Spouses */}
      <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Spouses</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        {family.husband ? <PersonCard person={family.husband} /> :
          <div className="card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No husband recorded</div>}
        {family.wife ? <PersonCard person={family.wife} /> :
          <div className="card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No wife recorded</div>}
      </div>

      {/* Children */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Children ({family.children.length})</h3>
        <Link to="/admin/persons/new" className="btn btn-secondary btn-sm"><Plus size={14} /> Add Person</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {family.children.map(c => <PersonCard key={c.id} person={c} />)}
        {family.children.length === 0 && (
          <div className="card" style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>No children recorded</div>
        )}
      </div>
    </div>
  )
}
