import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/i18n'
import { Globe } from 'lucide-react' // 👈 记得引入图标

export default function Login() {
  const navigate = useNavigate()
  const { t, lang, changeLang } = useLanguage()
  const [showLangMenu, setShowLangMenu] = useState(false) // 👈 控制菜单显示

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate('/')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 relative">
      
      {/* 🌍 语言切换器 (新增部分) */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-2 rounded-full bg-white shadow-sm hover:shadow-md text-gray-600 transition-all"
          >
            <Globe className="w-5 h-5" />
          </button>
          
          {/* 下拉菜单 */}
          {showLangMenu && (
            <div className="absolute right-0 top-12 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden w-32">
              <button onClick={() => {changeLang('en'); setShowLangMenu(false)}} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${lang === 'en' ? 'font-bold text-indigo-600' : ''}`}>English</button>
              <button onClick={() => {changeLang('zh'); setShowLangMenu(false)}} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${lang === 'zh' ? 'font-bold text-indigo-600' : ''}`}>中文</button>
              <button onClick={() => {changeLang('ja'); setShowLangMenu(false)}} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${lang === 'ja' ? 'font-bold text-indigo-600' : ''}`}>日本語</button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">{t.login_title}</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">{t.login_desc}</p>
        
        <Auth 
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
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