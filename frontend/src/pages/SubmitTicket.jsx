import { useState } from 'react'
import { submitTicket } from '../api'

const SEV_COLOR  = { Critical:'#e50914', High:'#f97316', Medium:'#eab308', Low:'#22c55e' }
const CARD = { background:'#1f1f1f', border:'1px solid #2a2a2a', borderRadius:6, padding:20 }

export default function SubmitTicket() {
  const [form,    setForm]    = useState({ title:'', description:'', submitted_by:'' })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await submitTicket(form)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 6666 }}>
      <PageHeader
        title="Submit a ticket"
        sub="AI will analyze, classify, and route it in seconds."
      />

      <div style={CARD}>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Field label="Your email">
            <input required value={form.submitted_by} placeholder="you@company.com"
              onChange={e => setForm(f => ({ ...f, submitted_by: e.target.value }))}
              style={{ width:'100%', padding:'10px 12px', fontSize:13 }}/>
          </Field>
          <Field label="Title">
            <input required value={form.title} placeholder="Brief summary of the issue"
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ width:'100%', padding:'10px 12px', fontSize:13 }}/>
          </Field>
          <Field label="Description">
            <textarea required rows={5} value={form.description}
              placeholder="Describe the issue in detail..."
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ width:'100%', padding:'10px 12px', fontSize:13, resize:'vertical' }}/>
          </Field>
          <button type="submit" disabled={loading} style={{
            padding:'12px 0', background: loading ? '#7f0a0f' : '#e50914',
            color:'#fff', border:'none', borderRadius:4, fontWeight:700,
            fontSize:14, cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing:0.5, transition:'background 0.2s',
          }}>
            {loading ? 'Analyzing with AI...' : 'Submit Ticket'}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ marginTop:16, padding:14, background:'#2a0a0a', border:'1px solid #7f1d1d', borderRadius:6, color:'#f87171', fontSize:13 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop:20 }}>
          {/* Header */}
          <div style={{ ...CARD, marginBottom:12, borderLeft:`3px solid ${result.status==='Resolved'?'#22c55e':'#e50914'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, color:'#737373', letterSpacing:1, marginBottom:4 }}>TICKET CREATED</div>
                <div style={{ fontSize:18, fontWeight:700 }}>#{result.id} — {result.title}</div>
              </div>
              <StatusBadge status={result.status}/>
            </div>
          </div>

          {/* AI grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
            {[
              ['CATEGORY',   result.ai_category],
              ['SEVERITY',   result.ai_severity],
              ['SENTIMENT',  result.ai_sentiment],
              ['CONFIDENCE', `${result.ai_confidence}%`],
              ['ROUTED TO',  result.assigned_dept],
              ['EST. HOURS', `${result.ai_est_hours}h`],
            ].map(([label, value]) => (
              <div key={label} style={{ background:'#2a2a2a', borderRadius:4, padding:'10px 14px' }}>
                <div style={{ fontSize:10, color:'#737373', letterSpacing:1.2, marginBottom:4 }}>{label}</div>
                <div style={{ fontWeight:700, fontSize:14,
                  color: label==='SEVERITY' ? SEV_COLOR[value] : '#e5e5e5' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {result.ai_summary && (
            <div style={{ ...CARD, marginBottom:12 }}>
              <div style={{ fontSize:10, color:'#737373', letterSpacing:1.2, marginBottom:8 }}>AI SUMMARY</div>
              <p style={{ fontSize:13, color:'#a3a3a3', lineHeight:1.7, margin:0 }}>{result.ai_summary}</p>
            </div>
          )}

          {result.auto_response && (
            <div style={{ background:'#0a1a0a', border:'1px solid #166534', borderRadius:6, padding:16 }}>
              <div style={{ fontSize:10, color:'#22c55e', letterSpacing:1.2, fontWeight:700, marginBottom:8 }}>
                ✓ AUTO-RESOLVED — RESPONSE SENT
              </div>
              <p style={{ fontSize:13, color:'#86efac', lineHeight:1.7, margin:0 }}>{result.auto_response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#a3a3a3', letterSpacing:1.2, marginBottom:6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    Resolved:       ['#14532d','#22c55e'],
    Closed:         ['#1c1c1c','#737373'],
    Assigned:       ['#1e3a5f','#3b82f6'],
    'In Progress':  ['#431407','#f97316'],
    'Pending Info': ['#3f3a10','#eab308'],
    New:            ['#2d1b4e','#a855f7'],
  }
  const [bg, color] = map[status] || ['#2a2a2a','#e5e5e5']
  return (
    <span style={{ padding:'4px 12px', borderRadius:3, fontSize:11, fontWeight:700,
      background:bg, color, letterSpacing:1 }}>
      {status.toUpperCase()}
    </span>
  )
}

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>{title}</h1>
      <p style={{ color: '#737373' }}>{sub}</p>
    </div>
  )
}