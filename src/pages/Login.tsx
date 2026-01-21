import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/i18n'
import { Globe, UserSecret, ArrowRight } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { t, lang, changeLang } = useLanguage()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [loadingGuest, setLoadingGuest] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate('/')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  const handleAnonymousLogin = async () => {
    setLoadingGuest(true)
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      alert("Error: " + error.message)
      setLoadingGuest(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 relative">
      
      {/* 语言切换 */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button onClick={() => setShowLangMenu(!showLangMenu)} className="p-2 rounded-full bg-white shadow-sm hover:shadow-md text-gray-600 transition-all">
            <Globe className="w-5 h-5" />
          </button>
          {showLangMenu && (
            <div className="absolute right-0 top-12 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden w-32">
              <button onClick={() => {changeLang('en'); setShowLangMenu(false)}} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50">English</button>
              <button onClick={() => {changeLang('zh'); setShowLangMenu(false)}} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50">中文</button>
              <button onClick={() => {changeLang('ja'); setShowLangMenu(false)}} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50">日本語</button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg space-y-6">
        <div className="text-center space-y-2">
           <h1 className="text-2xl font-bold text-gray-900">{t.login_title}</h1>
           <p className="text-gray-500 text-sm">{t.login_desc}</p>
        </div>

        {/* ✨ 核心变化：游客试用按钮放在最显眼的位置 */}
        <button
          onClick={handleAnonymousLogin}
          disabled={loadingGuest}
          className="w-full group relative overflow-hidden bg-black text-white hover:bg-gray-800 font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          <UserSecret className="w-5 h-5" />
          <span className="text-lg">
            {lang === 'zh' ? "先试用 (无需注册)" : lang === 'ja' ? "まずは試す (登録不要)" : "Try Guest Mode"}
          </span>
          <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </button>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-300 text-xs uppercase tracking-wider">or sign in with email</span>
            <div className="flex-grow border-t border-gray-200"></div>
        </div>
        
        <Auth 
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          localization={{
            variables: {
              sign_in: { email_label: t.email_label, password_label: t.password_label, button_label: t.btn_login, link_text: t.link_login },
              sign_up: { link_text: t.link_signup, button_label: t.btn_signup, email_label: t.email_label, password_label: t.password_label }
            }
          }}
        />
      </div>
    </div>
  )
}