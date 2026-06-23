import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '@/api/client'
import { ArrowLeft, Edit, Calendar, MapPin, Briefcase, FileText } from 'lucide-react'
import TimelineView from '@/components/timeline/TimelineView'
import PersonAvatar from '@/components/ui/PersonAvatar'
import { useAuthStore } from '@/store/authStore'

interface PersonDetail {
  id: string; first_name: string; last_name: string
  dob: string | null; dod: string | null; gender: string
  profile_pic_url: string | null; birth_place: string | null
  death_place: string | null; occupation: string | null; notes: string | null
  father_id: string | null; mother_id: string | null
}
interface RelativeSummary { id: string; first_name: string; last_name: string; gender: string }

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.625rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{value}</div>
      </div>
    </div>
  )
}

function RelativeChips({ label, items }: { label: string; items: RelativeSummary[] }) {
  if (!items?.length) return null
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
        {label} ({items.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {items.map(r => (
          <Link key={r.id} to={`/profile/${r.id}`} style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.25rem 0.75rem', borderRadius: 999,
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem', color: 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >
              {r.first_name} {r.last_name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { personId } = useParams()
  const [person, setPerson] = useState<PersonDetail | null>(null)
  const [relatives, setRelatives] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { isContributor, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const API_BASE = 'http://localhost:8000'

  useEffect(() => {
    if (!personId) return
    Promise.all([
      api.get(`/persons/${personId}`),
      api.get(`/persons/${personId}/relatives`),
    ]).then(([p, r]) => {
      setPerson(p.data)
      setRelatives(r.data)
    }).finally(() => setLoading(false))
  }, [personId])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
    </div>
  )
  if (!person) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Person not found.
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Back */}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Photo + basics */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                {person.profile_pic_url ? (
                  <img
                    src={`${API_BASE}${person.profile_pic_url}`}
                    alt={person.first_name}
                    style={{ width: 120, height: 140, borderRadius: 12, objectFit: 'cover', border: '3px solid var(--accent)' }}
                  />
                ) : (
                  <PersonAvatar person={person} size={120} style={{ borderRadius: 12, fontSize: '2.5rem' }} />
                )}
              </div>
              <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
                {person.first_name} {person.last_name}
              </h1>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${person.gender === 'male' ? 'badge-cyan' : 'badge-teal'}`}>{person.gender}</span>
                <span className="badge badge-teal">{person.id}</span>
                {person.dod && <span className="badge badge-danger">Deceased</span>}
              </div>

              {(isContributor() || isAdmin()) && (
                <Link to={`/admin/persons/${person.id}/edit`} className="btn btn-secondary btn-sm" style={{ marginTop: '1rem', justifyContent: 'center', width: '100%' }}>
                  <Edit size={14} /> Edit Profile
                </Link>
              )}
            </div>

            {/* Details */}
            <div className="card">
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Personal Details</h3>
              {person.dob && <InfoRow icon={<Calendar size={14} />} label="Date of Birth" value={person.dob} />}
              {person.dod && <InfoRow icon={<Calendar size={14} />} label="Date of Death" value={person.dod} />}
              {person.birth_place && <InfoRow icon={<MapPin size={14} />} label="Birth Place" value={person.birth_place} />}
              {person.death_place && <InfoRow icon={<MapPin size={14} />} label="Death Place" value={person.death_place} />}
              {person.occupation && <InfoRow icon={<Briefcase size={14} />} label="Occupation" value={person.occupation} />}
              {person.notes && <InfoRow icon={<FileText size={14} />} label="Notes" value={person.notes} />}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Relatives */}
            {relatives && (
              <div className="card">
                <h3 style={{ margin: '0 0 1rem' }}>Family Relationships</h3>
                <RelativeChips label="Spouses" items={relatives.spouses} />
                <RelativeChips label="Parents" items={relatives.parents} />
                <RelativeChips label="Children" items={relatives.children} />
                <RelativeChips label="Siblings" items={relatives.siblings} />
                <RelativeChips label="Grandparents" items={relatives.grandparents} />
                <RelativeChips label="Aunts & Uncles" items={relatives.aunts_uncles} />
                <RelativeChips label="Cousins" items={relatives.cousins} />
                <RelativeChips label="Nieces & Nephews" items={relatives.nieces_nephews} />
              </div>
            )}

            {/* Timeline */}
            <div className="card">
              <h3 style={{ margin: '0 0 1rem' }}>Life Timeline</h3>
              <TimelineView personId={person.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
