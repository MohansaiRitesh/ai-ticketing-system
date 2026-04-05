import { useState, useEffect } from 'react'
import { getSummary, getDeptLoad, getTopCategories, getSeverity, getAvgResolution } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const SEV_COLORS = { Critical:'#e50914', High:'#f97316', Medium:'#eab308', Low:'#22c55e' }
const CARD = { background:'#1f1f1f', border:'1px solid #2a2a2a', borderRadius:6, padding:20 }

const TOOLTIP_STYLE = {
  contentStyle: { background:'#1f1f1f', border:'1px solid #2a2a2a', borderRadius:4, color:'#e5e5e5', fontSize:12 },
  itemStyle: { color:'#e5e5e5' },
  labelStyle: { color:'#737373' },
}

export default function Dashboard() {
  const [summary,    setSummary]    = useState(null)
  const [deptLoad,   setDeptLoad]   = useState([])
  const [categories, setCategories] = useState([])
  const [severity,   setSeverity]   = useState([])
  const [avgRes,     setAvgRes]     = useState([])

  useEffect(() => {
    getSummary().then(r => setSummary(r.data))
    getDeptLoad().then(r => setDeptLoad(r.data))
    getTopCategories().then(r => setCategories(r.data))
    getSeverity().then(r => setSeverity(r.data))
    getAvgResolution().then(r => setAvgRes(r.data))
  }, [])

  if (!summary) return (
    <div style={{ color:'#737373', textAlign:'center', paddingTop:60 }}>Loading analytics...</div>
  )

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:28, fontWeight:900, color:'#fff', margin:0 }}>Analytics</h1>
        <p style={{ fontSize:13, color:'#737373', margin:'4px 0 0' }}>Live system overview</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:20 }}>
        {[
          { label:'TOTAL',        value: summary.total,                      color:'#e5e5e5' },
          { label:'OPEN',         value: summary.open,                       color:'#3b82f6' },
          { label:'RESOLVED',     value: summary.resolved,                   color:'#22c55e' },
          { label:'AUTO-RESOLVED',value: summary.auto_resolved,              color:'#a855f7' },
          { label:'ESCALATED',    value: summary.escalated,                  color:'#f97316' },
          { label:'AI SUCCESS',   value: `${summary.auto_resolution_success_rate}%`, color:'#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:'#1f1f1f', border:'1px solid #2a2a2a', borderRadius:6, padding:'16px 20px' }}>
            <div style={{ fontSize:9, color:'#737373', letterSpacing:1.5, marginBottom:8, fontWeight:700 }}>{label}</div>
            <div style={{ fontSize:30, fontWeight:900, color, lineHeight:1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>

        <div style={CARD}>
          <SectionLabel>Open tickets by department</SectionLabel>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptLoad}>
              <XAxis dataKey="department" tick={{ fontSize:10, fill:'#737373' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'#737373' }} axisLine={false} tickLine={false}/>
              <Tooltip {...TOOLTIP_STYLE}/>
              <Bar dataKey="open_tickets" fill="#e50914" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={CARD}>
          <SectionLabel>Severity breakdown</SectionLabel>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={severity} dataKey="count" nameKey="severity"
                cx="50%" cy="50%" outerRadius={75} innerRadius={35}
                label={({ severity: s, percent }) => `${s} ${(percent*100).toFixed(0)}%`}
                labelLine={{ stroke:'#404040' }}>
                {severity.map(entry => (
                  <Cell key={entry.severity} fill={SEV_COLORS[entry.severity] || '#737373'}/>
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

        <div style={CARD}>
          <SectionLabel>Top categories this week</SectionLabel>
          {categories.length === 0 && (
            <div style={{ color:'#404040', fontSize:13, padding:'20px 0' }}>No data yet</div>
          )}
          {categories.map((c, i) => (
            <div key={c.category} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <span style={{ fontSize:11, color:'#404040', width:18, textAlign:'right' }}>#{i+1}</span>
              <span style={{ fontSize:13, color:'#a3a3a3', flex:1 }}>{c.category}</span>
              <div style={{ width:100, height:4, background:'#2a2a2a', borderRadius:2, overflow:'hidden' }}>
                <div style={{
                  width:`${(c.count / (categories[0]?.count || 1)) * 100}%`,
                  height:'100%', background:'#e50914', borderRadius:2,
                }}/>
              </div>
              <span style={{ fontSize:12, color:'#737373', minWidth:18, textAlign:'right' }}>{c.count}</span>
            </div>
          ))}
        </div>

        <div style={CARD}>
          <SectionLabel>Avg resolution time (hours)</SectionLabel>
          {avgRes.length === 0 && (
            <div style={{ color:'#404040', fontSize:13, padding:'20px 0' }}>Resolve some tickets first</div>
          )}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={avgRes} layout="vertical">
              <XAxis type="number" tick={{ fontSize:10, fill:'#737373' }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="department" tick={{ fontSize:10, fill:'#737373' }}
                axisLine={false} tickLine={false} width={80}/>
              <Tooltip {...TOOLTIP_STYLE}/>
              <Bar dataKey="avg_hours" fill="#a855f7" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, color:'#737373', letterSpacing:1.5, marginBottom:14 }}>
      {children}
    </div>
  )
}