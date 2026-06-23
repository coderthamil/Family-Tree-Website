import { useEffect, useState } from 'react'
import api from '@/api/client'
import { X, Calendar, MapPin, Briefcase, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import PersonAvatar from '@/components/ui/PersonAvatar'
import TimelineView from '@/components/timeline/TimelineView'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

interface PersonDetail {
  id: string; first_name: string; last_name: string
  dob: string | null; dod: string | null; gender: string
  profile_pic_url: string | null; birth_place: string | null
  death_place: string | null; occupation: string | null; notes: string | null
  father_id: string | null; mother_id: string | null
}

interface RelativeSummary { id: string; first_name: string; last_name: string; gender: string }

export default function ProfileCard({ personId, onClose, onUpdate }: { personId: string; onClose: () => void; onUpdate?: () => void }) {
  const [person, setPerson] = useState<PersonDetail | null>(null)
  const [relatives, setRelatives] = useState<any>(null)
  const [tab, setTab] = useState<'info' | 'relatives' | 'timeline' | 'edit'>('info')

  const { isAdmin, isContributor } = useAuthStore()
  const canEdit = isAdmin() || isContributor()

  // Edit form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('unknown')
  const [dob, setDob] = useState('')
  const [dod, setDod] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [deathPlace, setDeathPlace] = useState('')
  const [occupation, setOccupation] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    setPerson(null)
    setRelatives(null)
    api.get(`/persons/${personId}`).then(r => setPerson(r.data))
    api.get(`/persons/${personId}/relatives`).then(r => setRelatives(r.data))
  }, [personId])

  useEffect(() => {
    if (person) {
      setFirstName(person.first_name || '')
      setLastName(person.last_name || '')
      setGender(person.gender || 'unknown')
      setDob(person.dob || '')
      setDod(person.dod || '')
      setBirthPlace(person.birth_place || '')
      setDeathPlace(person.death_place || '')
      setOccupation(person.occupation || '')
      setNotes(person.notes || '')
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }, [person, tab])

  const API_BASE = 'http://localhost:8000'

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.match('image.*')) {
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
      } else {
        toast.error('Please select an image file (JPEG, PNG, WebP)')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const toastId = toast.loading('Saving changes...')
    try {
      const payload = {
        first_name: firstName || null,
        last_name: lastName || null,
        gender: gender,
        dob: dob || null,
        dod: dod || null,
        birth_place: birthPlace || null,
        death_place: deathPlace || null,
        occupation: occupation || null,
        notes: notes || null,
      }

      await api.patch(`/persons/${personId}`, payload)

      if (photoFile) {
        const formData = new FormData()
        formData.append('file', photoFile)
        await api.post(`/persons/${personId}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      toast.success('Person updated successfully!', { id: toastId })
      
      const updatedPerson = await api.get(`/persons/${personId}`)
      setPerson(updatedPerson.data)
      
      if (onUpdate) onUpdate()
      setTab('info')
    } catch (err: any) {
      console.error(err)
      const errorMsg = err.response?.data?.detail || 'Failed to save changes'
      toast.error(errorMsg, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = canEdit 
    ? (['info', 'relatives', 'timeline', 'edit'] as const) 
    : (['info', 'relatives', 'timeline'] as const)

  const RelativeList = ({ label, items }: { label: string; items: RelativeSummary[] }) => {
    if (!items?.length) return null
    return (
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
          {label} ({items.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {items.map(r => (
            <Link key={r.id} to={`/profile/${r.id}`} style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.6rem', borderRadius: 999,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem', color: 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s',
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

  return (
    <div className="profile-drawer">
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
        >
          <X size={20} />
        </button>

        {!person ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ position: 'relative' }}>
              {person.profile_pic_url ? (
                <img
                  src={`${API_BASE}${person.profile_pic_url}`}
                  alt={person.first_name || ''}
                  style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--accent)' }}
                />
              ) : (
                <PersonAvatar person={person} size={72} style={{ borderRadius: 12, fontSize: '1.5rem' }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.2rem' }}>
                {person.first_name} {person.last_name}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`badge ${person.gender === 'male' ? 'badge-cyan' : 'badge-teal'}`}>
                  {person.gender}
                </span>
                <span className="badge badge-teal">{person.id}</span>
                {person.dod && <span className="badge badge-warning">Deceased</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '0.75rem',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
            transition: 'all 0.15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: '1.25rem', overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
        {/* Info Tab */}
        {tab === 'info' && person && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {person.dob && (
              <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Calendar size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent)' }} />
                <span>{person.dob} {person.dod ? `– ${person.dod}` : ''}</span>
              </div>
            )}
            {person.birth_place && (
              <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <MapPin size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent)' }} />
                <span>b. {person.birth_place}{person.death_place ? ` • d. ${person.death_place}` : ''}</span>
              </div>
            )}
            {person.occupation && (
              <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Briefcase size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent)' }} />
                <span>{person.occupation}</span>
              </div>
            )}
            {person.notes && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {person.notes}
              </div>
            )}
            <Link to={`/profile/${person.id}`} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
              <ExternalLink size={14} /> Full Profile
            </Link>
          </div>
        )}

        {/* Relatives Tab */}
        {tab === 'relatives' && relatives && (
          <div className="animate-fade-in">
            <RelativeList label="Spouses" items={relatives.spouses} />
            <RelativeList label="Parents" items={relatives.parents} />
            <RelativeList label="Children" items={relatives.children} />
            <RelativeList label="Siblings" items={relatives.siblings} />
            <RelativeList label="Grandparents" items={relatives.grandparents} />
            <RelativeList label="Aunts & Uncles" items={relatives.aunts_uncles} />
            <RelativeList label="Cousins" items={relatives.cousins} />
            <RelativeList label="Nieces & Nephews" items={relatives.nieces_nephews} />
          </div>
        )}

        {/* Timeline Tab */}
        {tab === 'timeline' && (
          <div className="animate-fade-in">
            <TimelineView personId={personId} />
          </div>
        )}

        {/* Edit Tab */}
        {tab === 'edit' && person && (
          <form onSubmit={handleSave} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="input"
                placeholder="First Name"
              />
            </div>
            
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="input"
                placeholder="Last Name"
              />
            </div>

            <div>
              <label className="label">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="input"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Date of Death</label>
                <input
                  type="date"
                  value={dod}
                  onChange={e => setDod(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Birth Place</label>
              <input
                type="text"
                value={birthPlace}
                onChange={e => setBirthPlace(e.target.value)}
                className="input"
                placeholder="Birth Place"
              />
            </div>

            <div>
              <label className="label">Death Place</label>
              <input
                type="text"
                value={deathPlace}
                onChange={e => setDeathPlace(e.target.value)}
                className="input"
                placeholder="Death Place"
              />
            </div>

            <div>
              <label className="label">Occupation</label>
              <input
                type="text"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                className="input"
                placeholder="Occupation"
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input"
                rows={3}
                style={{ resize: 'vertical' }}
                placeholder="Notes about this person..."
              />
            </div>

            <div>
              <label className="label">Profile Picture</label>
              <div 
                className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('photo-upload-input')?.click()}
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                <input 
                  type="file" 
                  id="photo-upload-input" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: 8, objectFit: 'contain' }} />
                ) : person.profile_pic_url ? (
                  <div>
                    <img
                      src={`${API_BASE}${person.profile_pic_url}`}
                      alt="Current"
                      style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: 8, objectFit: 'contain', marginBottom: '0.5rem' }}
                    />
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Drag & drop a new photo here to change, or click to browse
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Drag & drop profile photo here, or click to browse
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Supports JPG, PNG, WEBP</span>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
