import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getTicket, getTicketHistory, updateStatus,
  submitFeedback, getEmployees, reassignTicket,
  subscribeToTickets
} from '../api'

const SEV_COLOR = { Critical:'#e50914', High:'#f97316', Medium:'#eab308', Low:'#22c55e' }
const CARD  = { background:'#1f1f1f', border:'1px solid #2a2a2a', borderRadius:6, padding:20, marginBottom:12 }
const INPUT = { width:'100%', padding:'10px 12px', fontSize:13, borderRadius:4 }
const BTN_PRIMARY = {
  padding:'10px 20px', background:'#e50914', color:'#fff', border:'none',
  borderRadius:4, fontWeight:700, fontSize:13, cursor:'pointer', letterSpacing:0.5,
}
const BTN_GHOST = {
  padding:'8px 16px', background:'transparent', color:'#a3a3a3',
  border:'1px solid #404040', borderRadius:4, fontSize:13, cursor:'pointer',
}

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket,    setTicket]    = useState(null)
  const [history,   setHistory]   = useState([])
  const [employees, setEmployees] = useState([])
  const [note,      setNote]      = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [liveFlash, setLiveFlash] = useState(false)

  const reload = () => {
    getTicket(id).then(r => { setTicket(r.data); setNewStatus(r.data.status) })
    getTicketHistory(id).then(r => setHistory(r.data))
  }

  useEffect(() => {
    reload()
    getEmployees().then(r => setEmployees(r.data))
  }, [id])

  // SSE — auto-reload when this specific ticket changes
  useEffect(() => {
    const unsubscribe = subscribeToTickets((event) => {
      if (
        event.type === 'ticket_updated' &&
        String(event.data.id) === String(id)
      ) {
        reload()
        setLiveFlash(true)
        setTimeout(() => setLiveFlash(false), 2000)
      }
    })
    return unsubscribe
  }, [id])

  if (!ticket) return (
    <div style={{ color:'#737373', paddingTop:60, textAlign:'center' }}>Loading...</div>
  )

  const handleStatusUpdate = async () => {
    await updateStatus(id, newStatus, note, 'Agent')
    setNote('')
    reload()
  }

  return (
    <div style={{ maxWidth:760 }}>
      <button onClick={() => navigate('/tickets')} style={{ ...BTN_GHOST, marginBottom:20, fontSize:12 }}>
        ← Back to tickets
      </button>

      {/* Live flash indicator */}
      {liveFlash && (
        <div style={{ padding:'8px 14px', background:'#1e3a5f', border:'1px solid #3b82f6',
          borderRadius:6, marginBottom:12, fontSize:12, color:'#93c5fd' }}>
          ⚡ Ticket updated in real time
        </div>
      )}

      {/* Title bar */}
      <div style={{ ...CARD, borderLeft:`3px solid ${SEV_COLOR[ticket.ai_severity] || '#e50914'}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
          <div>
            <div style={{ fontSize:11, color:'#737373', letterSpacing:1, marginBottom:6 }}>TICKET #{ticket.id}</div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'#fff', margin:'0 0 6px' }}>{ticket.title}</h1>
            <div style={{ fontSize:12, color:'#737373' }}>
              Submitted by <span style={{ color:'#a3a3a3' }}>{ticket.submitted_by}</span>
              &nbsp;·&nbsp;{new Date(ticket.created_at).toLocaleString()}
            </div>
          </div>
          <SevBadge severity={ticket.ai_severity}/>
        </div>
      </div>

      {/* AI analysis */}
      <div style={CARD}>
        <SectionLabel>AI Analysis</SectionLabel>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {[
            ['CATEGORY',   ticket.ai_category],
            ['SENTIMENT',  ticket.ai_sentiment],
            ['CONFIDENCE', `${ticket.ai_confidence}%`],
            ['DEPARTMENT', ticket.assigned_dept],
            ['PATH',       ticket.ai_resolution_path],
            ['EST. HOURS', `${ticket.ai_est_hours}h`],
          ].map(([label, value]) => (
            <div key={label} style={{ background:'#2a2a2a', borderRadius:4, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'#737373', letterSpacing:1.2, marginBottom:3 }}>{label}</div>
              <div style={{ fontWeight:700, fontSize:13, color:'#e5e5e5' }}>{value}</div>
            </div>
          ))}
        </div>
        {ticket.ai_summary && (
          <p style={{ fontSize:13, color:'#a3a3a3', lineHeight:1.7, margin:0,
            borderTop:'1px solid #2a2a2a', paddingTop:12 }}>
            {ticket.ai_summary}
          </p>
        )}
      </div>

      {/* Auto response + feedback */}
      {ticket.auto_response && (
        <div style={{ background:'#0a1a0a', border:'1px solid #166534', borderRadius:6, padding:18, marginBottom:12 }}>
          <SectionLabel color="#22c55e">✓ Auto-response sent</SectionLabel>
          <p style={{ fontSize:13, color:'#86efac', lineHeight:1.7, margin:'0 0 14px' }}>
            {ticket.auto_response}
          </p>
          {ticket.feedback_helpful === null ? (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:12, color:'#737373' }}>Was this helpful?</span>
              <button onClick={() => submitFeedback(id, true).then(reload)}
                style={{ padding:'5px 14px', borderRadius:4, border:'1px solid #166534',
                  background:'#14532d', color:'#22c55e', fontSize:12, cursor:'pointer', fontWeight:700 }}>
                Yes
              </button>
              <button onClick={() => submitFeedback(id, false).then(reload)}
                style={{ padding:'5px 14px', borderRadius:4, border:'1px solid #7f1d1d',
                  background:'#2a0a0a', color:'#f87171', fontSize:12, cursor:'pointer', fontWeight:700 }}>
                No
              </button>
            </div>
          ) : (
            <div style={{ fontSize:12, color:'#737373' }}>
              Feedback: <span style={{ color: ticket.feedback_helpful ? '#22c55e' : '#e50914', fontWeight:700 }}>
                {ticket.feedback_helpful ? 'Helpful' : 'Not helpful'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Update ticket */}
      <div style={CARD}>
        <SectionLabel>Update Ticket</SectionLabel>
        <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
            style={{ padding:'9px 12px', fontSize:13, borderRadius:4, minWidth:160 }}>
            {['New','Assigned','In Progress','Pending Info','Resolved','Closed'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select defaultValue="" onChange={e => e.target.value && reassignTicket(id, e.target.value).then(reload)}
            style={{ padding:'9px 12px', fontSize:13, borderRadius:4, minWidth:200 }}>
            <option value="">Reassign to...</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
            ))}
          </select>
        </div>
        <textarea rows={2} value={note} placeholder="Add an internal note (optional)..."
          onChange={e => setNote(e.target.value)}
          style={{ ...INPUT, marginBottom:12, resize:'vertical' }}/>
        <button onClick={handleStatusUpdate} style={BTN_PRIMARY}>Save update</button>
      </div>

      {/* Timeline */}
      <div style={CARD}>
        <SectionLabel>Timeline</SectionLabel>
        <div style={{ display:'flex', flexDirection:'column' }}>
          {history.map((h, i) => (
            <div key={h.id} style={{ display:'flex', gap:14 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ width:10, height:10, borderRadius:'50%',
                  background: h.performed_by === 'AI System' ? '#e50914' : '#3b82f6',
                  marginTop:3, flexShrink:0 }}/>
                {i < history.length - 1 && (
                  <div style={{ width:1, flex:1, background:'#2a2a2a', margin:'4px 0' }}/>
                )}
              </div>
              <div style={{ paddingBottom:18 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#e5e5e5' }}>{h.action}</div>
                {h.note && (
                  <div style={{ fontSize:12, color:'#737373', marginTop:3, lineHeight:1.5 }}>{h.note}</div>
                )}
                <div style={{ fontSize:11, color:'#404040', marginTop:4 }}>
                  <span style={{ color: h.performed_by === 'AI System' ? '#e50914' : '#3b82f6' }}>
                    {h.performed_by}
                  </span>
                  &nbsp;·&nbsp;{new Date(h.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SevBadge({ severity }) {
  const c = { Critical:'#e50914', High:'#f97316', Medium:'#eab308', Low:'#22c55e' }
  return (
    <span style={{ padding:'5px 14px', borderRadius:3, fontSize:11, fontWeight:800,
      background:(c[severity] || '#737373') + '22', color: c[severity] || '#737373',
      letterSpacing:1, whiteSpace:'nowrap' }}>
      {severity?.toUpperCase()}
    </span>
  )
}

function SectionLabel({ children, color = '#737373' }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, color, letterSpacing:1.5, marginBottom:14 }}>
      {children}
    </div>
  )
}