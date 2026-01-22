import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Input from './pages/Input'
import Record from './pages/Record'
import Login from './pages/Login'
import { Loader2, LogOut, BarChart2, PlusCircle, List } from 'lucide-react'

// 底部导航栏 (Progress | Add | Record)
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
function TopBar() {
  const location = useLocation()
  if (location.pathname === '/login') return null

  return (
    <div className="fixed top-0 right-0 p-5 z-50">
      <button 
        onClick={() => supabase.auth.signOut()}
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-900" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 selection:bg-gray-200">
        {session && <TopBar />}
        
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