import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Loader2, Sparkles, Ghost, Globe, ArrowRight } from 'lucide-react'
import { useLanguage } from '../lib/i18n'

export default function Login() {
  const { lang, changeLang } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()

  // 📧 魔法链接登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      alert(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  // 👻 游客匿名登录
  const handleAnonymous = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.error('Anonymous login error:', error)
      alert('Error signing in anonymously')
    } else {
      // 成功后，App.tsx 会自动监听到 session 变化并跳转到 Home
      navigate('/')
    }
    setLoading(false)
  }

  // 🌍 简单的语言切换文字
  const texts = {
    zh: {
      title: '记忆心流',
      subtitle: '捕捉灵感，对抗遗忘',
      email_label: '邮箱地址',
      send_magic_link: '发送登录链接',
      sending: '发送中...',
      check_email: '请检查你的邮箱！点击链接即可登录。',
      guest_btn: '👻 游客试用 (无需注册)',
      or: '或'
    },
    en: {
      title: 'Memory Flow',
      subtitle: 'Capture ideas, defy forgetting',
      email_label: 'Email address',
      send_magic_link: 'Send Magic Link',
      sending: 'Sending...',
      check_email: 'Check your email! Click the link to login.',
      guest_btn: '👻 Guest Trial (No Signup)',
      or: 'or'
    },
    ja: {
      title: 'Memory Flow',
      subtitle: '思考を捉え、忘却に抗う',
      email_label: 'メールアドレス',
      send_magic_link: 'ログインリンクを送信',
      sending: '送信中...',
      check_email: 'メールを確認してください！リンクをクリックしてログイン。',
      guest_btn: '👻 ゲストとして試す',
      or: 'または'
    }
  }

  const t = texts[lang as keyof typeof texts] || texts.en

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 relative">
      
      {/* 🌍 右上角语言切换 */}
      <div className="absolute top-6 right-6 flex gap-2">
        <button onClick={() => changeLang('en')} className={`text-xs px-2 py-1 rounded ${lang === 'en' ? 'bg-black text-white' : 'text-gray-400'}`}>EN</button>
        <button onClick={() => changeLang('zh')} className={`text-xs px-2 py-1 rounded ${lang === 'zh' ? 'bg-black text-white' : 'text-gray-400'}`}>中</button>
        <button onClick={() => changeLang('ja')} className={`text-xs px-2 py-1 rounded ${lang === 'ja' ? 'bg-black text-white' : 'text-gray-400'}`}>日</button>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* 标题部分 */}
        <div className="text-center space-y-2">
          <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t.title}</h1>
          <p className="text-gray-500 font-medium">{t.subtitle}</p>
        </div>

        {sent ? (
          // 发送成功后的提示
          <div className="bg-green-50 p-6 rounded-2xl text-center border border-green-100">
            <p className="text-green-800 font-bold mb-2">Email Sent!</p>
            <p className="text-sm text-green-700">{t.check_email}</p>
            <button onClick={() => setSent(false)} className="mt-4 text-xs text-green-600 underline hover:text-green-800">
              Try different email
            </button>
          </div>
        ) : (
          // 登录表单
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t.email_label}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-gray-800"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading ? t.sending : t.send_magic_link}
            </button>
          </form>
        )}

        {/* 分割线 */}
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold uppercase">{t.or}</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        {/* 👻 游客按钮 */}
        <button
          onClick={handleAnonymous}
          disabled={loading}
          className="w-full bg-gray-900 text-white p-4 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ghost className="w-5 h-5" />}
          {t.guest_btn}
        </button>

      </div>
    </div>
  )
}