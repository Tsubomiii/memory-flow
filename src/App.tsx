import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js' // 引入类型
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Input from './pages/Input'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. App 启动时，先问问 Supabase：现在有人登录吗？
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. 设置一个监听器：如果在别的标签页退出了，这里也要同步变
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 如果还在检查身份中，显示个转圈圈
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          {/* 核心逻辑：如果 session 存在(已登录)，显示 Home，否则跳到 Login */}
          <Route path="/" element={session ? <Home /> : <Navigate to="/login" />} />
          
          {/* 同理，没登录不能写笔记 */}
          <Route path="/input" element={session ? <Input /> : <Navigate to="/login" />} />
          
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App