import { useEffect, useState } from 'react'
import api from '@/api/client'
import { useNavigate } from 'react-router-dom'
import FamilyTree from '@/components/tree/FamilyTree'
import {
  TreePine, Settings,
  Download, Share2, Sun, Moon, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface PersonSummary {
  id: string; first_name: string | null; last_name: string | null
  dob: string | null; gender: string; profile_pic_url: string | null
}

export default function TreePage() {
  const [roots, setRoots] = useState<PersonSummary[]>([])
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null)
  const [treeData, setTreeData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const { isAdmin, isContributor } = useAuthStore()
  const navigate = useNavigate()

  // Search option states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
    setIsDark(saved === 'dark')
  }, [])

  // Load tree roots
  useEffect(() => {
    api.get('/tree/roots').then(r => {
      setRoots(r.data)
      if (r.data.length > 0) setSelectedRoot(r.data[0].id)
    })
  }, [])

  // Load tree when root changes
  const refreshTree = () => {
    if (!selectedRoot) return
    setLoading(true)
    api.get(`/tree/${selectedRoot}`)
      .then(r => setTreeData(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refreshTree()
  }, [selectedRoot])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (val.trim().length < 2) {
      setSearchResults([])
      return
    }
    api.get('/persons/', { params: { search: val, limit: 10 } }).then(r => {
      setSearchResults(r.data)
    })
  }

  const handleSelectSearchResult = (person: any) => {
    const exists = roots.some(r => r.id === person.id)
    if (!exists) {
      setRoots(prev => [...prev, {
        id: person.id,
        first_name: person.first_name,
        last_name: person.last_name,
        gender: person.gender,
        dob: person.dob,
        profile_pic_url: person.profile_pic_url
      }])
    }
    setSelectedRoot(person.id)
    setSearchQuery('')
    setSearchResults([])
    setShowSearchDropdown(false)
  }

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    setIsDark(!isDark)
  }

  const exportPDF = async () => {
    const el = document.getElementById('tree-svg-container')
    if (!el) return
    toast.loading('Generating PDF…', { id: 'pdf' })
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 1.5 })
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save('family-tree.pdf')
      toast.success('PDF downloaded!', { id: 'pdf' })
    } catch {
      toast.error('PDF export failed', { id: 'pdf' })
    }
  }

  const shareTree = async () => {
    if (!selectedRoot) return
    try {
      const res = await api.post(`/export/share?root_id=${selectedRoot}`)
      const url = `${window.location.origin}/share/${res.data.token}`
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied to clipboard!')
    } catch {
      toast.error('Could not generate share link')
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <header style={{
        height: 56, background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center',
        padding: '0 1.25rem', gap: '1rem',
        flexShrink: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
          <TreePine size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Family Tree</span>
        </div>

        {/* Root selector */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedRoot || ''}
            onChange={e => setSelectedRoot(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              padding: '0.35rem 2rem 0.35rem 0.75rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
              appearance: 'none',
            }}
          >
            {roots.map(r => (
              <option key={r.id} value={r.id}>
                {r.first_name} {r.last_name} ({r.id})
              </option>
            ))}
          </select>
          <ChevronDown size={14} style={{
            position: 'absolute', right: '0.5rem', top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)',
          }} />
        </div>

        {/* Search option */}
        <div style={{ position: 'relative', width: 220 }}>
          <input
            type="text"
            placeholder="🔍 Search name..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 250)}
            style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          {showSearchDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              maxHeight: 250,
              overflowY: 'auto',
              zIndex: 100,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              {searchResults.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectSearchResult(p)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,167,225,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{p.first_name} {p.last_name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title="Toggle theme">
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={exportPDF} title="Export PDF">
          <Download size={16} />
        </button>
        {(isAdmin() || isContributor()) && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={shareTree} title="Share link">
              <Share2 size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin')} title="Admin panel">
              <Settings size={16} /> Admin
            </button>
          </>
        )}
      </header>

      {/* Tree canvas */}
      <div id="tree-svg-container" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,23,31,0.6)', zIndex: 10,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className="spinner" style={{ width: 48, height: 48 }} />
              <span style={{ color: 'var(--text-secondary)' }}>Building family tree…</span>
            </div>
          </div>
        )}
        {treeData && <FamilyTree data={treeData} onUpdate={refreshTree} />}
        {!loading && !treeData && roots.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <TreePine size={64} style={{ color: 'var(--border-color)', opacity: 0.3 }} />
            <p style={{ color: 'var(--text-muted)' }}>No family data yet. Import a GenoPro file to get started.</p>
            {(isAdmin() || isContributor()) && (
              <button className="btn btn-primary" onClick={() => navigate('/admin/import')}>Import Data</button>
            )}
          </div>
        )}
      </div>

      {/* Hint bar */}
      <div style={{
        height: 32, background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', padding: '0 1rem',
        fontSize: '0.72rem', color: 'var(--text-muted)', gap: '1.5rem',
      }}>
        <span>🖱 Scroll to zoom</span>
        <span>✋ Drag to pan</span>
        <span>🖱 Click node to view profile</span>
        <span>Click node again to expand/collapse</span>
      </div>
    </div>
  )
}
