import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar'
import PointsBadge from '../components/PointsBadge'

export default function Rewards() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [points, setPoints] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddPoints, setShowAddPoints] = useState(false)
  const [rewardForm, setRewardForm] = useState({
    title: '', description: '', points_required: 10
  })
  const [pointsForm, setPointsForm] = useState({ points: '', reason: '' })
  const [adding, setAdding] = useState(false)

  const token = localStorage.getItem('kidguard_token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchData = async () => {
    try {
      const [rewardsRes, pointsRes] = await Promise.all([
        axios.get(`/api/rewards/${id}`, { headers }),
        axios.get(`/api/rewards/${id}/points`, { headers })
      ])
      setData(rewardsRes.data)
      setPoints(pointsRes.data)
    } catch {
      setError('Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleAddReward = async (e) => {
    e.preventDefault()
    setAdding(true)
    setMessage('')
    setError('')

    try {
      await axios.post(`/api/rewards/${id}`, {
        title: rewardForm.title,
        description: rewardForm.description,
        points_required: parseInt(rewardForm.points_required)
      }, { headers })

      setRewardForm({ title: '', description: '', points_required: 10 })
      setShowAddForm(false)
      setMessage('Reward added successfully! 🎁')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add reward')
    } finally {
      setAdding(false)
    }
  }

  const handleAddPoints = async (e) => {
    e.preventDefault()
    setAdding(true)
    setMessage('')
    setError('')

    try {
      const res = await axios.post(`/api/rewards/${id}/points`, {
        points: parseInt(pointsForm.points),
        reason: pointsForm.reason
      }, { headers })

      setPointsForm({ points: '', reason: '' })
      setShowAddPoints(false)
      setMessage(res.data.message)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add points')
    } finally {
      setAdding(false)
    }
  }

  const handleClaimReward = async (rewardId, rewardTitle) => {
    if (!confirm(`Claim "${rewardTitle}"?`)) return
    setMessage('')
    setError('')

    try {
      const res = await axios.post(
        `/api/rewards/${id}/claim/${rewardId}`,
        {},
        { headers }
      )
      setMessage(res.data.message)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to claim reward')
    }
  }

  const handleDeleteReward = async (rewardId, rewardTitle) => {
    if (!confirm(`Delete "${rewardTitle}"?`)) return

    try {
      await axios.delete(`/api/rewards/${id}/delete/${rewardId}`, { headers })
      setMessage('Reward deleted')
      fetchData()
    } catch {
      setError('Failed to delete reward')
    }
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

  const availableRewards = data?.rewards?.filter(r => !r.is_claimed) || []
  const claimedRewards = data?.rewards?.filter(r => r.is_claimed) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(`/child/${id}`)}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {data?.child_name}'s Rewards 🎁
            </h1>
            <p className="text-gray-500 text-sm">
              Manage rewards and points
            </p>
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

        {/* Points Summary */}
        <div className="card mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-800">Total Points 🌟</h2>
              <p className="text-3xl font-bold text-yellow-500 mt-1">
                {data?.total_points || 0}
                <span className="text-sm text-gray-400 font-normal ml-1">
                  pts
                </span>
              </p>
            </div>
            <PointsBadge points={data?.total_points || 0} />
          </div>

          {/* Recent points history */}
          {points?.history?.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                RECENT ACTIVITY
              </p>
              <div className="space-y-2">
                {points.history.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 flex-1 mr-2">
                      {item.reason}
                    </p>
                    <span className={`text-sm font-bold ${
                      item.points > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn-secondary w-full mt-4 text-sm"
            onClick={() => setShowAddPoints(!showAddPoints)}
          >
            + Add Bonus Points
          </button>

          {showAddPoints && (
            <form onSubmit={handleAddPoints} className="mt-4 space-y-3">
              <input
                type="number"
                className="input-field"
                placeholder="Points to add"
                min="1"
                value={pointsForm.points}
                onChange={e => setPointsForm({
                  ...pointsForm, points: e.target.value
                })}
                required
              />
              <input
                type="text"
                className="input-field"
                placeholder="Reason (optional)"
                value={pointsForm.reason}
                onChange={e => setPointsForm({
                  ...pointsForm, reason: e.target.value
                })}
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={adding}
                >
                  {adding ? '...' : 'Add Points'}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setShowAddPoints(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Available Rewards */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800">
              Available Rewards ({availableRewards.length})
            </h2>
          </div>

          {availableRewards.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🎁</div>
              <p className="text-sm">No rewards yet. Add one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableRewards.map(reward => (
                <div key={reward.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-3">
                      <h3 className="font-semibold text-gray-800">
                        {reward.title}
                      </h3>
                      {reward.description && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {reward.description}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-yellow-600 mt-1">
                        🌟 {reward.points_required} points required
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg
                          transition-all ${
                          (data?.total_points || 0) >= reward.points_required
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={() => handleClaimReward(reward.id, reward.title)}
                        disabled={(data?.total_points || 0) < reward.points_required}
                      >
                        Claim
                      </button>
                      <button
                        className="text-xs text-red-400 hover:text-red-600
                                   text-center"
                        onClick={() => handleDeleteReward(reward.id, reward.title)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Reward Form */}
        {showAddForm && (
          <div className="card mb-4">
            <h3 className="font-bold text-gray-800 mb-4">New Reward 🎁</h3>
            <form onSubmit={handleAddReward} className="space-y-3">
              <input
                type="text"
                className="input-field"
                placeholder="Reward title (e.g. Extra TV time)"
                value={rewardForm.title}
                onChange={e => setRewardForm({
                  ...rewardForm, title: e.target.value
                })}
                required
              />
              <input
                type="text"
                className="input-field"
                placeholder="Description (optional)"
                value={rewardForm.description}
                onChange={e => setRewardForm({
                  ...rewardForm, description: e.target.value
                })}
              />
              <div>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Points required"
                  min="1"
                  value={rewardForm.points_required}
                  onChange={e => setRewardForm({
                    ...rewardForm, points_required: e.target.value
                  })}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Child needs this many points to claim
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={adding}
                >
                  {adding ? '...' : 'Add Reward'}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <button
          className="btn-primary w-full mb-4"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + Add New Reward
        </button>

        {/* Claimed Rewards */}
        {claimedRewards.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-3">
              Claimed Rewards ✅ ({claimedRewards.length})
            </h2>
            <div className="space-y-3">
              {claimedRewards.map(reward => (
                <div key={reward.id}
                  className="card opacity-60 border-dashed">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-600 line-through">
                        {reward.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        🌟 {reward.points_required} pts · Claimed ✅
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
        }
