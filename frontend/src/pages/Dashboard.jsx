import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar'
import ChildCard from '../components/ChildCard'

export default function Dashboard() {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    age: '',
    daily_limit_minutes: 120
  })
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  const parent = JSON.parse(localStorage.getItem('kidguard_parent') || '{}')
  const token = localStorage.getItem('kidguard_token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchChildren = async () => {
    try {
      const res = await axios.get('/api/children', { headers })
      setChildren(res.data.children || [])
    } catch {
      setError('Failed to load children')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchChildren() }, [])

  const handleAddChild = async (e) => {
    e.preventDefault()
    setAdding(true)
    setError('')

    try {
      await axios.post('/api/children', {
        name: form.name,
        age: parseInt(form.age),
        daily_limit_minutes: parseInt(form.daily_limit_minutes)
      }, { headers })

      setForm({ name: '', age: '', daily_limit_minutes: 120 })
      setShowAddForm(false)
      fetchChildren()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add child')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteChild = async (childId, childName) => {
    if (!confirm(`Remove ${childName} from KidGuard?`)) return

    try {
      await axios.delete(`/api/children/${childId}`, { headers })
      fetchChildren()
    } catch {
      setError('Failed to remove child')
    }
  }

  // Get status color based on screen time usage
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {getGreeting()}, {parent.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {children.length === 0
              ? 'Add your first child to get started'
              : `Monitoring ${children.length} kid${children.length > 1 ? 's' : ''}`
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                        rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        {children.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center py-3">
              <p className="text-2xl font-bold text-blue-600">
                {children.length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Kids</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-2xl font-bold text-green-600">
                {children.filter(c =>
                  c.today_minutes <= c.daily_limit_minutes
                ).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Within Limit</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-2xl font-bold text-red-500">
                {children.filter(c =>
                  c.today_minutes > c.daily_limit_minutes
                ).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Over Limit</p>
            </div>
          </div>
        )}

        {/* Children List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Loading...</p>
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🧒</div>
            <h3 className="text-lg font-semibold text-gray-700">
              No kids added yet
            </h3>
            <p className="text-gray-400 mt-1 text-sm">
              Add your first child to start monitoring
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {children.map(child => (
              <ChildCard
                key={child.id}
                child={child}
                onView={() => navigate(`/child/${child.id}`)}
                onDelete={() => handleDeleteChild(child.id, child.name)}
              />
            ))}
          </div>
        )}

        {/* Add Child Form */}
        {showAddForm && (
          <div className="card mb-4">
            <h3 className="font-bold text-gray-800 mb-4">
              Add a Child 🧒
            </h3>

            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child's Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Emma"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="8"
                  min="1"
                  max="17"
                  value={form.age}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Screen Time Limit (minutes)
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="120"
                  min="15"
                  max="720"
                  value={form.daily_limit_minutes}
                  onChange={e => setForm({
                    ...form, daily_limit_minutes: e.target.value
                  })}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: 120 min (2hrs) for school-age kids
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={adding}
                >
                  {adding ? 'Adding...' : 'Add Child'}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => {
                    setShowAddForm(false)
                    setForm({ name: '', age: '', daily_limit_minutes: 120 })
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Child Button */}
        {!showAddForm && (
          <button
            className="btn-primary w-full"
            onClick={() => setShowAddForm(true)}
          >
            + Add Child
          </button>
        )}
      </div>
    </div>
  )
}
