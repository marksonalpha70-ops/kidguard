import ScreenTimeBar from './ScreenTimeBar'

export default function ChildCard({ child, onView, onDelete }) {
  const percentage = Math.min(
    100,
    Math.round((child.today_minutes / child.daily_limit_minutes) * 100)
  )

  const isOverLimit = child.today_minutes >= child.daily_limit_minutes

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  // Avatar emoji based on age
  const getAvatar = (age) => {
    if (age <= 4) return '👶'
    if (age <= 8) return '🧒'
    if (age <= 12) return '👦'
    return '🧑'
  }

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center 
                        justify-center text-2xl">
            {getAvatar(child.age)}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{child.name}</h3>
            <p className="text-gray-400 text-sm">Age {child.age}</p>
          </div>
        </div>

        {/* Status badge */}
        <span className={isOverLimit ? 'badge-red' : 'badge-green'}>
          {isOverLimit ? '⛔ Over limit' : '✅ On track'}
        </span>
      </div>

      {/* Screen Time Bar */}
      <ScreenTimeBar
        used={child.today_minutes}
        limit={child.daily_limit_minutes}
        percentage={percentage}
      />

      {/* Time Stats */}
      <div className="flex justify-between mt-3 mb-4">
        <div>
          <p className="text-xs text-gray-400">Used today</p>
          <p className={`font-bold text-sm ${
            isOverLimit ? 'text-red-500' : 'text-gray-700'
          }`}>
            {formatTime(child.today_minutes)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Daily limit</p>
          <p className="font-bold text-sm text-gray-700">
            {formatTime(child.daily_limit_minutes)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          className="btn-primary flex-1 py-2 text-sm"
          onClick={onView}
        >
          View Details
        </button>
        <button
          className="btn-danger py-2 px-4 text-sm"
          onClick={onDelete}
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
