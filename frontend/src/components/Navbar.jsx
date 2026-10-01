import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const parent = JSON.parse(localStorage.getItem('kidguard_parent') || '{}')

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('kidguard_token')
      localStorage.removeItem('kidguard_parent')
      navigate('/login')
    }
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="text-2xl">🛡️</span>
          <span className="text-lg font-bold text-blue-700">KidGuard</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Parent avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center 
                          justify-center text-blue-600 font-bold text-sm">
              {parent.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {parent.name?.split(' ')[0]}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-red-500 
                       transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
