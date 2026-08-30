import { Search, RefreshCw, Bell, Settings } from 'lucide-react'

export default function Header({ title, subtitle }) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-dark-700 rounded-lg px-3 py-1.5 text-sm text-gray-400 border border-dark-600">
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-4 text-[10px] bg-dark-600 px-1.5 py-0.5 rounded border border-dark-500">⌘K</kbd>
        </div>

        {/* Refresh */}
        <button className="flex items-center gap-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg px-3 py-1.5 text-sm text-gray-300 border border-dark-600 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>

        {/* Icons */}
        <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-200 relative transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer">SC</div>
      </div>
    </header>
  )
}
