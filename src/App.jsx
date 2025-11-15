import { useEffect, useMemo, useState } from 'react'

function formatCurrency(n) {
  const num = Number(n || 0)
  return `$${num.toFixed(2)}`
}

export default function App() {
  const API = '/api'
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0 })
  const [loadingUI, setLoadingUI] = useState(true)
  const [type, setType] = useState('expense')
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('fd_theme')
      if (saved === 'dark') return true
      if (saved === 'light') return false
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch { return false }
  })
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category_id: '',
    type: 'expense',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const filteredCategories = useMemo(
    () => categories.filter(c => c.type === type),
    [categories, type]
  )

  useEffect(() => {
    Promise.all([loadCategories(), loadTransactions(), loadAnalytics()]).finally(() =>
      setTimeout(() => setLoadingUI(false), 300)
    )
    const id = setInterval(() => {
      loadTransactions()
      loadAnalytics()
    }, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // ensure category matches type
    if (filteredCategories.length && !filteredCategories.find(c => String(c.id) === String(form.category_id))) {
      setForm(f => ({ ...f, category_id: filteredCategories[0]?.id || '' }))
    }
  }, [filteredCategories])

  async function loadCategories() {
    try {
      const res = await fetch(`${API}/categories`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setCategories(list)
    } catch (e) {
      console.error('loadCategories', e)
      setCategories([])
    }
  }

  async function loadTransactions() {
    try {
      const res = await fetch(`${API}/transactions`)
      const data = await res.json()
      setTransactions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('loadTransactions', e)
      setTransactions([])
    }
  }

  async function loadAnalytics() {
    try {
      const res = await fetch(`${API}/analytics`)
      const data = await res.json()
      const safeSummary = data && data.summary ? data.summary : { total_income: 0, total_expenses: 0, transaction_count: 0 }
      const byCategory = Array.isArray(data && data.byCategory) ? data.byCategory : []
      setSummary(safeSummary)
      // Chart (optional)
      if (window.Chart) {
        const el = document.getElementById('categoryChart')
        if (window.__chart) {
          try { window.__chart.destroy() } catch { /* ignore */ }
          window.__chart = null
        }
        if (el && byCategory.length > 0) {
          window.__chart = new window.Chart(el, {
            type: 'doughnut',
            data: {
              labels: byCategory.map(c => c.name || ''),
              datasets: [{
                data: byCategory.map(c => Number(c.total || 0)),
                backgroundColor: byCategory.map(c => c.color || '#667eea')
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } }
            }
          })
        }
      }
    } catch (e) {
      console.error('loadAnalytics', e)
      setSummary({ total_income: 0, total_expenses: 0, transaction_count: 0 })
      if (window.__chart) {
        try { window.__chart.destroy() } catch { /* ignore */ }
        window.__chart = null
      }
    }
  }

  async function addTransaction() {
    if (!form.description || !form.amount || !form.category_id) {
      alert('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      await fetch(`${API}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          description: form.description,
          amount: parseFloat(form.amount),
          category_id: parseInt(form.category_id, 10),
          type: form.type,
          notes: form.notes
        })
      })
      setForm(f => ({ ...f, description: '', amount: '' }))
      await Promise.all([loadTransactions(), loadAnalytics()])
    } catch {
      alert('Error adding transaction')
    } finally {
      setLoading(false)
    }
  }

  async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return
    try {
      await fetch(`${API}/transactions/${id}`, { method: 'DELETE' })
      await Promise.all([loadTransactions(), loadAnalytics()])
    } catch {
      alert('Error deleting transaction')
    }
  }

  const net = (Number(summary.total_income || 0) - Number(summary.total_expenses || 0))

  useEffect(() => {
    try { localStorage.setItem('fd_theme', darkMode ? 'dark' : 'light') } catch {}
  }, [darkMode])

  return (
    <div style={{ ...pageStyle, background: darkMode ? '#0b1020' : '#f8fafc', color: darkMode ? '#e5e7eb' : '#0f172a', fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial" }}>
      {/* Top navigation bar */}
      <div style={{
        background: darkMode ? '#0f172a' : '#ffffff',
        borderBottom: `1px solid ${darkMode ? '#1f2937' : '#e5e7eb'}`,
        padding: '14px 20px'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: darkMode ? '#1d2a4a' : '#eef2ff',
              display: 'grid', placeItems: 'center', fontSize: 15
            }}>₿</div>
            <div>
              <div style={{ fontWeight: 700, letterSpacing: 0.2, fontSize: 16 }}>Finance Dashboard</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Overview</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 12,
              border: `1px solid ${darkMode ? '#334155' : '#e5e7eb'}`,
              padding: '4px 8px',
              borderRadius: 999,
              background: darkMode ? '#0b1220' : '#fff',
              opacity: 0.8
            }}>Auto-refresh 30s</span>
            <button
              onClick={() => setDarkMode(d => !d)}
              style={{
                background: darkMode ? '#111827' : '#0f172a',
                color: '#ffffff',
                padding: '8px 12px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13
              }}
              aria-label="Toggle dark mode"
            >
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>

      <div style={container}>
        <div style={grid3}>
          <div style={{
            ...metricCard,
            background: darkMode ? '#0f172a' : '#ffffff',
            border: `1px solid ${darkMode ? '#1f2937' : '#e5e7eb'}`
          }}>
            <div style={metricHeader}>
              <span style={metricIcon}>📈</span>
              <h2 style={metricTitle}>Total Income</h2>
            </div>
            <div style={{ ...metricValue, color: '#27ae60' }}>{formatCurrency(summary.total_income)}</div>
            <div style={metricFooter}>Last 30 days</div>
          </div>

          <div style={{
            ...metricCard,
            background: darkMode ? '#0f172a' : '#ffffff',
            border: `1px solid ${darkMode ? '#1f2937' : '#e5e7eb'}`
          }}>
            <div style={metricHeader}>
              <span style={metricIcon}>💸</span>
              <h2 style={metricTitle}>Total Expenses</h2>
            </div>
            <div style={{ ...metricValue, color: '#e74c3c' }}>{formatCurrency(summary.total_expenses)}</div>
            <div style={metricFooter}>Last 30 days</div>
          </div>

          <div style={{
            ...metricCard,
            background: darkMode ? '#0f172a' : '#ffffff',
            border: `1px solid ${darkMode ? '#1f2937' : '#e5e7eb'}`
          }}>
            <div style={metricHeader}>
              <span style={metricIcon}>💼</span>
              <h2 style={metricTitle}>Net Savings</h2>
            </div>
            <div style={{ ...metricValue, color: '#667eea' }}>{formatCurrency(net)}</div>
            <div style={metricFooter}>{net >= 0 ? 'On track' : 'Over budget'}</div>
          </div>
        </div>

        <div style={grid2}>
          <div style={{
            ...cardStyle,
            background: darkMode ? '#0f172a' : '#ffffff',
            border: `1px solid ${darkMode ? '#1f2937' : '#e5e7eb'}`
          }}>
            <h2 style={h2Style}>➕ Add Transaction</h2>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, background: darkMode ? '#0f1429' : '#fff', borderColor: darkMode ? '#2b3358' : '#e0e0e0', color: darkMode ? '#e5e7eb' : '#111827' }} />
            </div>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g., Grocery shopping" style={{ ...inputStyle, background: darkMode ? '#0f1429' : '#fff', borderColor: darkMode ? '#2b3358' : '#e0e0e0', color: darkMode ? '#e5e7eb' : '#111827' }} />
            </div>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={{ ...inputStyle, background: darkMode ? '#0f1429' : '#fff', borderColor: darkMode ? '#2b3358' : '#e0e0e0', color: darkMode ? '#e5e7eb' : '#111827' }} />
            </div>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Type</label>
              <select value={form.type} onChange={e => { setType(e.target.value); setForm(f => ({ ...f, type: e.target.value })) }} style={{ ...inputStyle, background: darkMode ? '#0f1429' : '#fff', borderColor: darkMode ? '#2b3358' : '#e0e0e0', color: darkMode ? '#e5e7eb' : '#111827' }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Category</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} style={{ ...inputStyle, background: darkMode ? '#0f1429' : '#fff', borderColor: darkMode ? '#2b3358' : '#e0e0e0', color: darkMode ? '#e5e7eb' : '#111827' }}>
                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={addTransaction} disabled={loading} style={{ ...buttonStyle, background: darkMode ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : buttonStyle.background }}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>

          <div style={{
            ...cardStyle,
            background: darkMode ? '#0f172a' : '#ffffff',
            border: `1px solid ${darkMode ? '#1f2937' : '#e5e7eb'}`
          }}>
            <h2 style={h2Style}>📈 Spending by Category</h2>
            <div className="chart-container" style={chartWrap}>
              <canvas id="categoryChart"></canvas>
              {loadingUI && <div style={skeleton} />}
            </div>
          </div>
        </div>

        <div style={{
          ...cardStyle,
          background: darkMode ? '#0f172a' : '#ffffff',
          border: `1px solid ${darkMode ? '#1f2937' : '#e5e7eb'}`
        }}>
          <h2 style={h2Style}>📋 Recent Transactions</h2>
          <div className="transaction-list" style={listWrap}>
            {transactions.length === 0 ? (
              <div style={emptyState}>No transactions yet. Add your first one!</div>
            ) : transactions.map(t => (
              <div key={t.id} className={`transaction ${t.type}`} style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.85))',
                padding: 16, marginBottom: 12, borderRadius: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderLeft: `5px solid ${t.type === 'income' ? '#27ae60' : '#e74c3c'}`,
                boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                backdropFilter: 'blur(6px)'
              }}>
                <div className="transaction-info" style={{ flex: 1 }}>
                  <div className="transaction-desc" style={{ fontWeight: 700, marginBottom: 6, color: '#2c2c2c' }}>{t.description}</div>
                  <div className="transaction-meta" style={{ fontSize: '0.85em', color: '#666' }}>
                    <span style={{
                      background: t.category_color || '#667eea',
                      color: 'white', padding: '3px 10px', borderRadius: 999, fontSize: '0.75em', marginRight: 8,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}>
                      {t.category_name}
                    </span>
                    {new Date(t.date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="transaction-amount" style={{ fontSize: '1.3em', fontWeight: 'bold', color: t.type === 'income' ? '#27ae60' : '#e74c3c' }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(Number(t.amount)))}
                  </div>
                  <button onClick={() => deleteTransaction(t.id)} style={{ ...buttonStyle, background: '#e74c3c', width: 'auto', marginLeft: 10 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const pageStyle = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  minHeight: '100vh',
  background: 'radial-gradient(1200px 400px at -10% -20%, #e8ecff 0%, rgba(232,236,255,0) 60%), radial-gradient(1200px 400px at 110% 120%, #ffe7f6 0%, rgba(255,231,246,0) 60%), #f6f7fb'
}

const headerWrap = { position: 'relative', overflow: 'hidden', padding: '48px 24px' }
const headerBackdrop = {
  position: 'absolute', inset: 0,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}
const headerContent = { position: 'relative', maxWidth: 1400, margin: '0 auto', color: 'white' }
const logoBadge = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', fontSize: 22
}
const headerTitle = { fontSize: '2.2em', fontWeight: 800, letterSpacing: 0.3, margin: 0 }
const headerSubtitle = { marginTop: 8, opacity: 0.9 }
const headerChips = { marginTop: 16, display: 'flex', gap: 10 }
const chip = { background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)', padding: '6px 12px', borderRadius: 999, fontSize: 12 }
const chipSecondary = { ...chip, background: 'rgba(255,255,255,0.15)' }

const container = { maxWidth: 1400, margin: '0 auto', padding: 24 }
const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 24 }
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }
const metricCard = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.85))',
  padding: 22, borderRadius: 14, boxShadow: '0 12px 30px rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)',
  border: '1px solid rgba(102,126,234,0.15)'
}
const metricHeader = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }
const metricIcon = { fontSize: 18 }
const metricTitle = { fontSize: '1.05em', color: '#333', margin: 0, fontWeight: 700, letterSpacing: 0.2 }
const metricValue = { fontSize: '2.1em', fontWeight: 800, marginTop: 6 }
const metricFooter = { marginTop: 6, fontSize: 12, color: '#777' }

const cardStyle = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9))',
  padding: 25, borderRadius: 14, boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)'
}
const h2Style = { fontSize: '1.1em', color: '#333', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, letterSpacing: 0.3 }
const fgStyle = { marginBottom: 15 }
const labelField = { display: 'block', marginBottom: 5, color: '#555', fontWeight: 500 }
const inputStyle = {
  width: '100%', padding: 12, border: '2px solid #e0e0e0', borderRadius: 10, fontSize: 14, transition: 'border 0.25s, transform 0.1s',
  background: '#fff'
}
const buttonStyle = {
  background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white',
  padding: '12px 24px', border: 'none', borderRadius: 12, cursor: 'pointer',
  fontSize: 16, width: '100%', boxShadow: '0 10px 20px rgba(102,126,234,0.25)', transition: 'transform 0.1s ease'
}
const chartWrap = { position: 'relative', height: 300, overflow: 'hidden', borderRadius: 12 }
const skeleton = {
  position: 'absolute', inset: 0, background:
    'linear-gradient(90deg, rgba(240,240,240,0.6) 0%, rgba(255,255,255,0.9) 50%, rgba(240,240,240,0.6) 100%)',
  animation: 'pulse 1.2s ease-in-out infinite'
}
const listWrap = { maxHeight: 500, overflowY: 'auto', paddingRight: 4 }
const emptyState = { textAlign: 'center', padding: 40, color: '#999' }



