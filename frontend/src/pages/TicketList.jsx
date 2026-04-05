import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets, subscribeToTickets } from '../api'

const SEV_COLOR = { Critical:'#e50914', High:'#f97316', Medium:'#eab308', Low:'#22c55e' }
const STATUS_BG = {
  New:'#2d1b4e', Assigned:'#1e3a5f', 'In Progress':'#431407',
  'Pending Info':'#3f3a10', Resolved:'#14532d', Closed:'#1c1c1c'
}
const STATUS_FG = {
  New:'#a855f7', Assigned:'#3b82f6', 'In Progress':'#f97316',
  'Pending Info':'#eab308', Resolved:'#22c55e', Closed:'#737373'
}
const SELECT_STYLE = {
  padding:'8px 12px', fontSize:12, borderRadius:4,
  background:'#1f1f1f', color:'#e5e5e5', border:'1px solid #2a2a2a', cursor:'pointer',
}

export default function TicketList() {
  const [tickets,   setTickets]   = useState([])
  const [filters,   setFilters]   = useState({ status:'', department:'', severity:'' })
  const [liveAlert, setLiveAlert] = useState(null)
  const navigate = useNavigate()

  const load = (f) => {
    const params = Object.fromEntries(Object.entries(f).filter(([,v]) => v))
    getTickets(params).then(r => setTickets(r.data))
  }

  useEffect(() => {
    load(filters)
  }, [filters])

  // SSE subscription — runs once on mount
  useEffect(() => {
    const unsubscribe = subscribeToTickets((event) => {
      // Refresh list whenever any ticket changes
      load(filters)

      // Show a brief live alert banner
      if (event.type === 'ticket_created') {
        setLiveAlert(`New ticket #${event.data.id} submitted — ${event.data.title}`)
        setTimeout(() => setLiveAlert(null), 4000)
      } else if (event.type === 'ticket_updated') {
        setLiveAlert(`Ticket #${event.data.id} updated`)
        setTimeout(() => setLiveAlert(null), 3000)
      }
    })
    return unsubscribe
  }, []) // empty deps — subscribe once, never reconnect

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#fff', margin:0 }}>All Tickets</h1>
          <p style={{ fontSize:13, color:'#737373', margin:'4px 0 0' }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            <span style={{ marginLeft:10, fontSize:11, color:'#22c55e' }}>
              ● Live
            </span>
          </p>
        </div>
      </div>

      {/* Live alert banner */}
      {liveAlert && (
        <div style={{
          padding:'10px 16px', background:'#1e3a5f', border:'1px solid #3b82f6',
          borderRadius:6, marginBottom:16, fontSize:13, color:'#93c5fd',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{ fontSize:16 }}>⚡</span>
          {liveAlert}
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { key:'status',     label:'Status',
            opts:['New','Assigned','In Progress','Pending Info','Resolved','Closed'] },
          { key:'severity',   label:'Severity',   opts:['Critical','High','Medium','Low'] },
          { key:'department', label:'Department',
            opts:['Engineering','Finance','HR','IT','Legal','Marketing','DevOps'] },
        ].map(({ key, label, opts }) => (
          <select key={key} value={filters[key]} style={SELECT_STYLE}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}>
            <option value="">All {label}</option>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        <button onClick={() => setFilters({ status:'', department:'', severity:'' })}
          style={{ ...SELECT_STYLE, background:'transparent', border:'1px solid #404040', color:'#a3a3a3' }}>
          Clear
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'#1f1f1f', border:'1px solid #2a2a2a', borderRadius:6, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #2a2a2a' }}>
              {['#','Title','Category','Severity','Status','Department','Submitted'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:10,
                  fontWeight:700, color:'#737373', letterSpacing:1.2 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                style={{ borderBottom:'1px solid #2a2a2a', cursor:'pointer', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding:'13px 16px', color:'#737373', fontFamily:'monospace' }}>#{t.id}</td>
                <td style={{ padding:'13px 16px', fontWeight:500, maxWidth:220,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#e5e5e5' }}>
                  {t.title}
                </td>
                <td style={{ padding:'13px 16px', color:'#a3a3a3' }}>{t.ai_category}</td>
                <td style={{ padding:'13px 16px' }}>
                  <span style={{ color: SEV_COLOR[t.ai_severity], fontWeight:700, fontSize:12 }}>
                    {t.ai_severity?.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding:'13px 16px' }}>
                  <span style={{ padding:'3px 10px', borderRadius:3, fontSize:10, fontWeight:700,
                    background: STATUS_BG[t.status] || '#2a2a2a',
                    color:      STATUS_FG[t.status] || '#e5e5e5', letterSpacing:0.8 }}>
                    {t.status?.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding:'13px 16px', color:'#a3a3a3' }}>{t.assigned_dept}</td>
                <td style={{ padding:'13px 16px', color:'#737373', fontSize:12 }}>{t.submitted_by}</td>
              </tr>
            ))}
            {!tickets.length && (
              <tr>
                <td colSpan={7} style={{ padding:48, textAlign:'center', color:'#404040', fontSize:14 }}>
                  No tickets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}