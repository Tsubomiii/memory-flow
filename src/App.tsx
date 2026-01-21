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
    // 1. 初始化检查：現在有人登錄嗎？
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. 實時監聽：登錄/退出時自動更新
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 如果还在检查身份，显示个转圈圈，防止闪屏
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
        {/* 如果没登录 -> 显示 Login，如果登录了 -> 踢回首页 */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
        {/* 如果登录了 -> 显示 Home，没登录 -> 踢去 Login */}
        <Route path="/" element={session ? <Home /> : <Navigate to="/login" />} />
        
        {/* 单独的输入页 */}
        <Route path="/input" element={session ? <Input /> : <Navigate to="/login" />} />
        
        {/* 瞎输网址 -> 回首页 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}