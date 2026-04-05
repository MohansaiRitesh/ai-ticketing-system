import { useState, useEffect } from 'react'
import { getEmployees, createEmployee, updateEmployee, deactivateEmployee } from '../api'

const DEPTS = ['Engineering','Finance','HR','IT','Legal','Marketing','DevOps']
const CARD = { background:'#1f1f1f', border:'1px solid #2a2a2a', borderRadius:6 }
const INPUT = { width:'100%', padding:'9px 12px', fontSize:13, borderRadius:4 }
const AVAIL_STYLE = {
  Available: ['#14532d','#22c55e'],
  Busy:      ['#3f3a10','#eab308'],
  'On Leave':['#1c1c1c','#737373'],
}

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [form, setForm] = useState({
    name:'', email:'', department:'Engineering',
    designation:'', skill_tags:'', availability:'Available'
  })

  const reload = () => getEmployees().then(r => setEmployees(r.data))
  useEffect(() => { reload() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createEmployee({
      ...form,
      skill_tags: form.skill_tags.split(',').map(s => s.trim()).filter(Boolean)
    })
    setShowForm(false)
    setForm({ name:'', email:'', department:'Engineering', designation:'', skill_tags:'', availability:'Available' })
    reload()
  }

  const toggleAvail = async (emp) => {
    const next = emp.availability === 'Available' ? 'Busy' : 'Available'
    await updateEmployee(emp.id, { availability: next })
    reload()
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#fff', margin:0 }}>Employees</h1>
          <p style={{ fontSize:13, color:'#737373', margin:'4px 0 0' }}>{employees.length} active members</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{
          padding:'10px 20px', background: showForm ? '#2a2a2a' : '#e50914',
          color:'#fff', border:'none', borderRadius:4, fontWeight:700,
          fontSize:13, cursor:'pointer', letterSpacing:0.5,
        }}>
          {showForm ? 'Cancel' : '+ Add Employee'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...CARD, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:10, color:'#737373', letterSpacing:1.5, marginBottom:16 }}>NEW EMPLOYEE</div>
          <form onSubmit={handleSubmit} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { key:'name',        label:'Full Name',               ph:'Jane Smith' },
              { key:'email',       label:'Email',                   ph:'jane@company.com' },
              { key:'designation', label:'Designation',             ph:'Senior Engineer' },
              { key:'skill_tags',  label:'Skills (comma separated)',ph:'Python, Database, API' },
            ].map(({ key, label, ph }) => (
              <div key={key}>
                <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#737373', letterSpacing:1.2, marginBottom:5 }}>
                  {label}
                </label>
                <input required value={form[key]} placeholder={ph}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={INPUT}/>
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#737373', letterSpacing:1.2, marginBottom:5 }}>
                Department
              </label>
              <select value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                style={{ ...INPUT, cursor:'pointer' }}>
                {DEPTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end' }}>
              <button type="submit" style={{
                width:'100%', padding:'10px 0', background:'#e50914', color:'#fff',
                border:'none', borderRadius:4, fontWeight:700, fontSize:13, cursor:'pointer',
              }}>
                Save Employee
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12 }}>
        {employees.map(emp => {
          const [bg, fg] = AVAIL_STYLE[emp.availability] || ['#2a2a2a','#737373']
          return (
            <div key={emp.id} style={CARD}>
              {/* Top strip */}
              <div style={{ height:3, background:'#e50914', borderRadius:'6px 6px 0 0' }}/>
              <div style={{ padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'#fff' }}>{emp.name}</div>
                    <div style={{ fontSize:12, color:'#737373', marginTop:2 }}>{emp.designation}</div>
                  </div>
                  <span style={{ padding:'3px 10px', borderRadius:3, fontSize:10, fontWeight:700,
                    background:bg, color:fg, letterSpacing:0.8 }}>
                    {emp.availability.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize:12, color:'#737373', marginBottom:10 }}>
                  <span style={{ color:'#a3a3a3', fontWeight:600 }}>{emp.department}</span>
                  &nbsp;·&nbsp;{emp.email}
                </div>

                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:14 }}>
                  {(emp.skill_tags || []).map(s => (
                    <span key={s} style={{ padding:'2px 8px', background:'#2a2a2a',
                      color:'#a3a3a3', borderRadius:3, fontSize:11, border:'1px solid #404040' }}>
                      {s}
                    </span>
                  ))}
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => toggleAvail(emp)} style={{
                    flex:1, padding:'7px 0', borderRadius:4, border:'1px solid #404040',
                    background:'transparent', color:'#a3a3a3', fontSize:12, cursor:'pointer',
                  }}>
                    Toggle Status
                  </button>
                  <button onClick={() => confirm(`Deactivate ${emp.name}?`) && deactivateEmployee(emp.id).then(reload)}
                    style={{ padding:'7px 14px', borderRadius:4, border:'1px solid #7f1d1d',
                      background:'transparent', color:'#e50914', fontSize:12, cursor:'pointer' }}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}