import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Input from './pages/Input'
import Record from './pages/Record'
import Login from './pages/Login'
import { Loader2, LogOut, BarChart2, PlusCircle, List, AlertTriangle } from 'lucide-react'

// 底部导航栏 (保持不变)
function BottomNav() {
  const location = useLocation()
  if (location.pathname === '/login') return null

  const getLinkClass = (path: string) => 
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
      location.pathname === path ? 'text-gray-900' : 'text-gray-300'
    }`

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex justify-around items-center z-50">
      <Link to="/" className={getLinkClass('/')}>
        <BarChart2 size={22} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
        <span className="text-[10px] font-semibold tracking-widest uppercase">Progress</span>
      </Link>
      
      <Link to="/add" className={getLinkClass('/add')}>
        <PlusCircle size={22} strokeWidth={location.pathname === '/add' ? 2.5 : 2} />
        <span className="text-[10px] font-semibold tracking-widest uppercase">Add</span>
      </Link>

      <Link to="/record" className={getLinkClass('/record')}>
        <List size={22} strokeWidth={location.pathname === '/record' ? 2.5 : 2} />
        <span className="text-[10px] font-semibold tracking-widest uppercase">Record</span>
      </Link>
    </div>
  )
}

// 顶部退出按钮
function TopBar({ isGuest, onLogoutClick }: { isGuest: boolean; onLogoutClick: () => void }) {
  const location = useLocation()
  if (location.pathname === '/login') return null

  return (
    // ⭐️ 修改点：
    // 1. absolute: 让它随页面滚动
    // 2. z-30: 让它层级低于 Banner (z-40)，这样滚动时会钻到 Banner 下面去
    <div className={`absolute right-0 p-5 z-30 transition-all duration-300 ${isGuest ? 'top-14' : 'top-0'}`}>
      <button 
        onClick={onLogoutClick}
        className="text-gray-300 hover:text-black transition-colors"
      >
        <LogOut size={20} />
      </button>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowLogoutConfirm(false)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-900" />
      </div>
    )
  }

  const isGuest = session?.user?.is_anonymous ?? false

  return (
    <BrowserRouter>
      {/* 相对定位容器 */}
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 selection:bg-gray-200 relative">
        
        {session && <TopBar isGuest={isGuest} onLogoutClick={() => setShowLogoutConfirm(true)} />}
        
        {/* 退出确认弹窗 */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Sign Out?</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {isGuest 
                  ? "Are you sure? Guest mode data will be lost immediately upon exit." 
                  : "You are about to sign out of your account."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout}
                  className="py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 shadow-lg shadow-red-200 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={session ? <Home /> : <Navigate to="/login" />} />
          <Route path="/add" element={session ? <Input /> : <Navigate to="/login" />} />
          <Route path="/record" element={session ? <Record /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
        </Routes>
        
        {session && <BottomNav />}
      </div>
    </BrowserRouter>
  )
}

export default App