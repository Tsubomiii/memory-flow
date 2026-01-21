import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Input from './pages/Input'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. 初始化：检查有没有人登录
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. 监听：登录/退出变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 如果还在检查身份，显示转圈圈
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 核心逻辑：登录了去 Home，没登录去 Login */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={session ? <Home /> : <Navigate to="/login" />} />
        
        <Route path="/input" element={session ? <Input /> : <Navigate to="/login" />} />
        
        {/* 乱输网址 -> 回首页 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}