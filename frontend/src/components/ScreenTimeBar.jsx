export default function ScreenTimeBar({ used, limit, percentage }) {
  // Color based on usage percentage
  const getBarColor = () => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-400'
    if (percentage >= 50) return 'bg-yellow-400'
    return 'bg-green-500'
  }

  const getTextColor = () => {
    if (percentage >= 100) return 'text-red-500'
    if (percentage >= 75) return 'text-orange-500'
    if (percentage >= 50) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div className="w-full">
      {/* Bar */}
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      {/* Percentage label */}
      <div className="flex justify-between items-center mt-1">
        <p className="text-xs text-gray-400">
          {used} / {limit} min
        </p>
        <p className={`text-xs font-bold ${getTextColor()}`}>
          {percentage}%
        </p>
      </div>
    </div>
  )
}
