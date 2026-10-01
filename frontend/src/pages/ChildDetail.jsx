import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import Navbar from '../components/Navbar'
import ScreenTimeBar from '../components/ScreenTimeBar'

export default function ChildDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [child, setChild] = useState(null)
  const [today, setToday] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logMinutes, setLogMinutes] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const [logging, setLogging] = useState(false)
  const [updatingLimit, setUpdatingLimit] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const token = localStorage.getItem('kidguard_token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchData = async () => {
    try {
      const [childRes, todayRes, weeklyRes] = await Promise.all([
        axios.get(`/api/children/${id}`, { headers }),
        axios.get(`/api/screentime/${id}/today`, { headers }),
        axios.get(`/api/screentime/${id}/weekly`, { headers })
      ])
      setChild(childRes.data.child)
      setToday(todayRes.data)
      setWeekly(weeklyRes.data)
      setNewLimit(childRes.data.child.daily_limit_minutes)
    } catch {
      setError('Failed to load child data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleLogTime = async (e) => {
    e.preventDefault()
    setLogging(true)
    setMessage('')
    setError('')

    try {
      const res = await axios.post(
        `/api/screentime/${id}/log`,
        { minutes_used: parseInt(logMinutes) },
        { headers }
      )
      setMessage(res.data.message)
      setLogMinutes('')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log time')
    } finally {
      setLogging(false)
    }
  }

  const handleUpdateLimit = async (e) => {
    e.preventDefault()
    setUpdatingLimit(true)
    setMessage('')
    setError('')

    try {
      const res = await axios.put(
        `/api/screentime/${id}/limit`,
        { daily_limit_minutes: parseInt(newLimit) },
        { headers }
      )
      setMessage(res.data.message)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update limit')
    } finally {
      setUpdatingLimit(false)
    }
  }

  // Format minutes to hours & minutes
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  // Format date for chart
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">⏳</div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {child?.name} 🧒
            </h1>
            <p className="text-gray-500 text-sm">Age {child?.age}</p>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700
                        rounded-xl p-3 mb-4 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                        rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Today's Screen Time */}
        {today && (
          <div className="card mb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800">Today's Screen Time</h2>
              <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                today.is_limit_reached
                  ? 'bg-red-100 text-red-600'
                  : today.percentage_used > 75
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-green-100 text-green-600'
              }`}>
                {today.is_limit_reached ? '⛔ Limit Reached' : '✅ Within Limit'}
              </span>
            </div>

            <ScreenTimeBar
              used={today.minutes_used}
              limit={today.daily_limit_minutes}
              percentage={today.percentage_used}
            />

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatTime(today.minutes_used)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatTime(today.remaining_minutes)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Remaining</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-700">
                  {formatTime(today.daily_limit_minutes)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Daily Limit</p>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Chart */}
        {weekly && weekly.weekly_logs.length > 0 && (
          <div className="card mb-4">
            <h2 className="font-bold text-gray-800 mb-1">7-Day Report 📊</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-blue-600">
                  {formatTime(weekly.stats.total_minutes)}
                </p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-600">
                  {formatTime(weekly.stats.average_daily_minutes)}
                </p>
                <p className="text-xs text-gray-400">Daily Avg</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-600">
                  {weekly.stats.days_within_limit}
                </p>
                <p className="text-xs text-gray-400">Days OK</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekly.weekly_logs.map(log => ({
                day: formatDate(log.date),
                minutes: log.minutes_used,
                limit: weekly.daily_limit_minutes
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value} min`, 'Screen Time']}
                />
                <ReferenceLine
                  y={weekly.daily_limit_minutes}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: 'Limit', position: 'right', fontSize: 11 }}
                />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Log Screen Time */}
        <div className="card mb-4">
          <h2 className="font-bold text-gray-800 mb-4">Log Screen Time ⏱️</h2>
          <form onSubmit={handleLogTime} className="flex gap-3">
            <input
              type="number"
              className="input-field flex-1"
              placeholder="Minutes used"
              min="1"
              max="720"
              value={logMinutes}
              onChange={e => setLogMinutes(e.target.value)}
              required
            />
            <button
              type="submit"
              className="btn-primary px-6"
              disabled={logging}
            >
              {logging ? '...' : 'Log'}
            </button>
          </form>
        </div>

        {/* Update Daily Limit */}
        <div className="card mb-4">
          <h2 className="font-bold text-gray-800 mb-4">
            Update Daily Limit ⚙️
          </h2>
          <form onSubmit={handleUpdateLimit} className="flex gap-3">
            <input
              type="number"
              className="input-field flex-1"
              placeholder="Minutes"
              min="15"
              max="720"
              value={newLimit}
              onChange={e => setNewLimit(e.target.value)}
              required
            />
            <button
              type="submit"
              className="btn-primary px-6"
              disabled={updatingLimit}
            >
              {updatingLimit ? '...' : 'Save'}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            Min: 15 minutes · Max: 720 minutes (12 hours)
          </p>
        </div>

        {/* Rewards Button */}
        <button
          className="btn-primary w-full"
          onClick={() => navigate(`/child/${id}/rewards`)}
        >
          🎁 View Rewards & Points
        </button>
      </div>
    </div>
  )
    }
