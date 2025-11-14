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
  const [type, setType] = useState('expense')
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
    loadCategories()
    loadTransactions()
    loadAnalytics()
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

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: 30, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '2em', marginBottom: 5 }}>💰 Personal Finance Dashboard</h1>
        <p style={{ opacity: 0.9 }}>Track expenses, manage budgets, achieve financial goals</p>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 30 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 30 }}>
          <div className="card" style={cardStyle}>
            <h2 style={h2Style}>📊 This Month</h2>
            <div className="stat-label" style={labelStyle}>Total Income</div>
            <div className="stat positive" style={{ ...statStyle, color: '#27ae60' }}>{formatCurrency(summary.total_income)}</div>
            <div className="stat-label" style={labelStyle}>Total Expenses</div>
            <div className="stat negative" style={{ ...statStyle, color: '#e74c3c' }}>{formatCurrency(summary.total_expenses)}</div>
            <div className="stat-label" style={labelStyle}>Net Savings</div>
            <div className="stat" style={{ ...statStyle, color: '#667eea' }}>{formatCurrency(net)}</div>
          </div>

          <div className="card" style={cardStyle}>
            <h2 style={h2Style}>➕ Add Transaction</h2>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g., Grocery shopping" style={inputStyle} />
            </div>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inputStyle} />
            </div>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Type</label>
              <select value={form.type} onChange={e => { setType(e.target.value); setForm(f => ({ ...f, type: e.target.value })) }} style={inputStyle}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-group" style={fgStyle}>
              <label style={labelField}>Category</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} style={inputStyle}>
                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={addTransaction} disabled={loading} style={buttonStyle}>{loading ? 'Adding...' : 'Add Transaction'}</button>
          </div>

          <div className="card" style={cardStyle}>
            <h2 style={h2Style}>📈 Spending by Category</h2>
            <div className="chart-container" style={{ position: 'relative', height: 300 }}>
              <canvas id="categoryChart"></canvas>
            </div>
          </div>
        </div>

        <div className="card" style={cardStyle}>
          <h2 style={h2Style}>📋 Recent Transactions</h2>
          <div className="transaction-list" style={{ maxHeight: 500, overflowY: 'auto' }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>No transactions yet. Add your first one!</div>
            ) : transactions.map(t => (
              <div key={t.id} className={`transaction ${t.type}`} style={{
                background: '#f8f9fa', padding: 15, marginBottom: 10, borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderLeft: `4px solid ${t.type === 'income' ? '#27ae60' : '#e74c3c'}`
              }}>
                <div className="transaction-info" style={{ flex: 1 }}>
                  <div className="transaction-desc" style={{ fontWeight: 600, marginBottom: 5 }}>{t.description}</div>
                  <div className="transaction-meta" style={{ fontSize: '0.85em', color: '#666' }}>
                    <span style={{ background: t.category_color, color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.8em', marginRight: 8 }}>
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

const cardStyle = {
  background: 'white',
  padding: 25,
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
}
const h2Style = { fontSize: '1.2em', color: '#333', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }
const statStyle = { fontSize: '2.2em', fontWeight: 'bold', margin: '10px 0' }
const labelStyle = { color: '#666', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: 1 }
const fgStyle = { marginBottom: 15 }
const labelField = { display: 'block', marginBottom: 5, color: '#555', fontWeight: 500 }
const inputStyle = {
  width: '100%', padding: 10, border: '2px solid #e0e0e0', borderRadius: 6, fontSize: 14, transition: 'border 0.3s'
}
const buttonStyle = { background: '#667eea', color: 'white', padding: '12px 24px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, width: '100%' }



