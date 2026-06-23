import { useEffect, useState } from 'react'
import api from '@/api/client'

interface TimelineEvent {
  id: number; person_id: string; event_type: string
  start_date: string | null; end_date: string | null
  description: string | null; location: string | null
}

const EVENT_COLORS: Record<string, string> = {
  birth: '#22c55e', death: '#ef4444', marriage: '#00A7E1',
  divorce: '#f59e0b', education: '#8b5cf6', occupation: '#007EA7',
  migration: '#f97316', custom: '#6b7280',
}

const EVENT_ICONS: Record<string, string> = {
  birth: '🌱', death: '✦', marriage: '💍', divorce: '📜',
  education: '🎓', occupation: '💼', migration: '✈️', custom: '📌',
}

export default function TimelineView({ personId }: { personId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/persons/${personId}/timeline`)
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false))
  }, [personId])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
  if (!events.length) return <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No timeline events recorded</div>

  return (
    <div className="timeline-track">
      {events.map((event, i) => (
        <div key={event.id} className="timeline-item" style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="timeline-dot" style={{ background: EVENT_COLORS[event.event_type] || '#007EA7' }} />
          <div style={{ padding: '0 0 0 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem' }}>{EVENT_ICONS[event.event_type] || '📌'}</span>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: EVENT_COLORS[event.event_type] || '#007EA7',
              }}>
                {event.event_type}
              </span>
              {event.start_date && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {event.start_date}
                </span>
              )}
            </div>
            {event.description && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {event.description}
              </div>
            )}
            {event.location && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                📍 {event.location}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
