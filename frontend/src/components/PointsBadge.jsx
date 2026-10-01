export default function PointsBadge({ points }) {
  // Tier based on points
  const getTier = () => {
    if (points >= 500) return { label: 'Legend', emoji: '👑', color: 'bg-yellow-100 text-yellow-700' }
    if (points >= 200) return { label: 'Champion', emoji: '🏆', color: 'bg-purple-100 text-purple-700' }
    if (points >= 100) return { label: 'Star', emoji: '⭐', color: 'bg-blue-100 text-blue-700' }
    if (points >= 50) return { label: 'Rising', emoji: '🌟', color: 'bg-green-100 text-green-700' }
    return { label: 'Starter', emoji: '🌱', color: 'bg-gray-100 text-gray-600' }
  }

  const tier = getTier()

  return (
    <div className={`flex flex-col items-center justify-center 
                    rounded-2xl p-3 ${tier.color} min-w-[80px]`}>
      <span className="text-3xl">{tier.emoji}</span>
      <span className="text-xs font-bold mt-1">{tier.label}</span>
      <span className="text-xs mt-0.5 opacity-70">{points} pts</span>
    </div>
  )
}
