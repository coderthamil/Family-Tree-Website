import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, Save, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface PersonForm {
  first_name: string; last_name: string; gender: string
  dob: string; dod: string; father_id: string; mother_id: string
  notes: string; birth_place: string; death_place: string; occupation: string
}

const EMPTY: PersonForm = {
  first_name: '', last_name: '', gender: 'unknown',
  dob: '', dod: '', father_id: '', mother_id: '',
  notes: '', birth_place: '', death_place: '', occupation: '',
}

export default function PersonEditPage() {
  const { personId } = useParams()
  const isNew = !personId
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()

  const [form, setForm] = useState<PersonForm>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isNew) {
      api.get(`/persons/${personId}`).then(r => {
        const p = r.data
        setForm({
          first_name: p.first_name || '', last_name: p.last_name || '',
          gender: p.gender || 'unknown',
          dob: p.dob || '', dod: p.dod || '',
          father_id: p.father_id || '', mother_id: p.mother_id || '',
          notes: p.notes || '',
          birth_place: p.birth_place || '', death_place: p.death_place || '',
          occupation: p.occupation || '',
        })
        setPhotoPreview(p.profile_pic_url ? `http://localhost:8000${p.profile_pic_url}` : null)
        setLoading(false)
      })
    }
  }, [personId, isNew])

  const set = (key: keyof PersonForm, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v || null])
      )
      let id = personId
      if (isNew) {
        const res = await api.post('/persons/', payload)
        id = res.data.id
        toast.success(`Person ${id} created!`)
      } else {
        await api.patch(`/persons/${personId}`, payload)
        toast.success('Person updated!')
      }
      // Upload photo if selected
      if (photoFile && id) {
        const fd = new FormData()
        fd.append('file', photoFile)
        await api.post(`/persons/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Photo uploaded!')
      }
      navigate(-1)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${form.first_name} ${form.last_name}? This cannot be undone.`)) return
    await api.delete(`/persons/${personId}`)
    toast.success('Person deleted')
    navigate(-1)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  if (loading) return (
    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: 760 }} className="animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={{ margin: '0 0 1.5rem' }}>{isNew ? 'Add New Person' : `Edit: ${form.first_name} ${form.last_name}`}</h1>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
          {/* Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input className="input" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <div>
              <label className="label">Date of Death</label>
              <input className="input" type="date" value={form.dod} onChange={e => set('dod', e.target.value)} />
            </div>
            <div>
              <label className="label">Occupation</label>
              <input className="input" value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="Occupation" />
            </div>
            <div>
              <label className="label">Birth Place</label>
              <input className="input" value={form.birth_place} onChange={e => set('birth_place', e.target.value)} placeholder="City, Country" />
            </div>
            <div>
              <label className="label">Death Place</label>
              <input className="input" value={form.death_place} onChange={e => set('death_place', e.target.value)} placeholder="City, Country" />
            </div>
            <div>
              <label className="label">Father ID</label>
              <input className="input" value={form.father_id} onChange={e => set('father_id', e.target.value)} placeholder="e.g. I12" />
            </div>
            <div>
              <label className="label">Mother ID</label>
              <input className="input" value={form.mother_id} onChange={e => set('mother_id', e.target.value)} placeholder="e.g. I13" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Notes</label>
              <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Photo upload */}
          <div style={{ width: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 140, height: 160, borderRadius: 12,
                border: '2px dashed var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden',
                transition: 'border-color 0.2s',
                background: 'var(--bg-secondary)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              {photoPreview
                ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>
                    <Upload size={24} style={{ marginBottom: '0.5rem' }} /><br/>Click to upload photo
                  </div>}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhotoChange} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>JPEG/PNG/WebP • max 5 MB</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="submit" className="btn btn-primary" disabled={saving} id="save-person-btn">
            {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : <><Save size={16} /> Save Person</>}
          </button>
          {!isNew && isAdmin() && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
