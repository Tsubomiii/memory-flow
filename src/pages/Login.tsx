import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    // 监听：如果用户登录成功了，就自动踢到首页
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">欢迎回来</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">请登录以同步你的记忆</p>
        
        {/* Supabase 官方提供的登录组件 */}
        <Auth 
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]} // 暂时不放 Google，先用邮箱
          localization={{
            variables: {
              sign_in: {
                email_label: '邮箱地址',
                password_label: '密码',
                button_label: '登录',
              },
              sign_up: {
                link_text: '没有账号？点此注册',
                button_label: '注册新账号',
                email_label: '邮箱地址',
                password_label: '密码',
              }
            }
          }}
        />
      </div>
    </div>
  )
}