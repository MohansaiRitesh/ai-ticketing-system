// import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import SubmitTicket  from './pages/SubmitTicket.jsx'
import TicketList    from './pages/TicketList.jsx'
import TicketDetail  from './pages/TicketDetail.jsx'
import Employees     from './pages/Employees.jsx'
import Dashboard     from './pages/Dashboard.jsx'
import Notifications from './pages/Notifications.jsx'

const NAV = [
  { to:'/',              label:'Submit Ticket', icon:'＋' },
  { to:'/tickets',       label:'All Tickets',   icon:'☰'  },
  { to:'/employees',     label:'Employees',     icon:'◉'  },
  { to:'/dashboard',     label:'Analytics',     icon:'▦'  },
  { to:'/notifications', label:'Notifications', icon:'◎'  },
]

export default function App() {
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#141414' }}>

      <aside style={{
        width:240, background:'linear-gradient(180deg,#000 0%,#141414 100%)',
        borderRight:'1px solid #1f1f1f', display:'flex', flexDirection:'column',
        position:'fixed', top:0, left:0, bottom:0, zIndex:100,
      }}>
        <div style={{ padding:'28px 24px 24px', borderBottom:'1px solid #1f1f1f' }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#e50914', letterSpacing:'-0.5px' }}>
            TICKET<span style={{ color:'#fff' }}>AI</span>
          </div>
          <div style={{ fontSize:11, color:'#737373', marginTop:2, letterSpacing:1 }}>
            HELPDESK PLATFORM
          </div>
        </div>

        <nav style={{ padding:'16px 12px', flex:1 }}>
          <div style={{ fontSize:10, color:'#737373', letterSpacing:1.5, padding:'0 12px', marginBottom:8 }}>
            NAVIGATION
          </div>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:12, padding:'11px 12px',
              borderRadius:4, textDecoration:'none', fontSize:13,
              fontWeight: isActive ? 700 : 400,
              color:      isActive ? '#fff' : '#a3a3a3',
              background: isActive ? '#e50914' : 'transparent',
              marginBottom:2, transition:'all 0.15s',
            })}>
              <span style={{ fontSize:14, opacity:0.9 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:'16px 24px', borderTop:'1px solid #1f1f1f' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e' }}/>
            <span style={{ fontSize:11, color:'#737373' }}>AI Engine · Live</span>
          </div>
        </div>
      </aside>

      <main style={{ marginLeft:240, flex:1, minHeight:'100vh', padding:'32px 36px' }}>
        <Routes>
          <Route path="/"              element={<SubmitTicket />}  />
          <Route path="/tickets"       element={<TicketList />}    />
          <Route path="/tickets/:id"   element={<TicketDetail />}  />
          <Route path="/employees"     element={<Employees />}     />
          <Route path="/dashboard"     element={<Dashboard />}     />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </main>
    </div>
  )
}