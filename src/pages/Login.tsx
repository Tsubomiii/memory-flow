import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/i18n' // 引入

export default function Login() {
  const navigate = useNavigate()
  const { t } = useLanguage() // 获取翻译

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate('/')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">{t.login_title}</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">{t.login_desc}</p>

        <Auth 
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          // ✨ 核心：把字典里的字传给 Supabase
          localization={{
            variables: {
              sign_in: {
                email_label: t.email_label,
                password_label: t.password_label,
                button_label: t.btn_login,
                link_text: t.link_login,
              },
              sign_up: {
                link_text: t.link_signup,
                button_label: t.btn_signup,
                email_label: t.email_label,
                password_label: t.password_label,
              }
            }
          }}
        />
      </div>
    </div>
  )
}