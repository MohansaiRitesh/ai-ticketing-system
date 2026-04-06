import { useState, useEffect } from 'react'
import { getNotifications, markNotificationRead } from '../api'

export default function Notifications() {
  const [notifs, setNotifs] = useState([])

  const reload = () => getNotifications().then(r => setNotifs(r.data))
  useEffect(() => { reload() }, [])

  const markRead = async (id) => {
    try {
        await markNotificationRead(id)
        // Optimistically update UI without full reload
        setNotifs(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
    } catch (err) {
        console.error('Failed to mark as read:', err)
    }
}

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:28, fontWeight:900, color:'#fff', margin:0 }}>
          Notifications
          {unread > 0 && (
            <span style={{ marginLeft:12, fontSize:14, padding:'3px 10px', borderRadius:10,
              background:'#e50914', color:'#fff', fontWeight:700, verticalAlign:'middle' }}>
              {unread} new
            </span>
          )}
        </h1>
        <p style={{ fontSize:13, color:'#737373', margin:'4px 0 0' }}>
          Simulated email notifications — every ticket update logged here
        </p>
      </div>

      {notifs.length === 0 && (
        <div style={{ padding:48, textAlign:'center', color:'#404040', fontSize:14 }}>
          No notifications yet — submit a ticket to see them here
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {notifs.map(n => (
          <div key={n.id} style={{
            background: n.is_read ? '#1a1a1a' : '#1f1f1f',
            border: `1px solid ${n.is_read ? '#1f1f1f' : '#2a2a2a'}`,
            borderLeft: `3px solid ${n.is_read ? '#2a2a2a' : '#e50914'}`,
            borderRadius:6, padding:'14px 18px',
            opacity: n.is_read ? 0.6 : 1,
            transition:'all 0.2s',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight: n.is_read ? 400 : 700, color:'#e5e5e5', marginBottom:4 }}>
                  {n.subject}
                </div>
                <div style={{ fontSize:12, color:'#737373', marginBottom:8,
                  whiteSpace:'pre-line', lineHeight:1.6 }}>
                  {n.message}
                </div>
                <div style={{ fontSize:11, color:'#404040' }}>
                  To: <span style={{ color:'#737373' }}>{n.recipient}</span>
                  &nbsp;·&nbsp;{new Date(n.created_at).toLocaleString()}
                  &nbsp;·&nbsp;Ticket #{n.ticket_id}
                </div>
              </div>
              {!n.is_read && (
                <button onClick={() => markRead(n.id)} style={{
                  padding:'5px 12px', background:'transparent', border:'1px solid #404040',
                  borderRadius:4, color:'#737373', fontSize:11, cursor:'pointer', flexShrink:0,
                }}>
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}