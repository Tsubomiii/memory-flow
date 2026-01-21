import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Fingerprint, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react'
import { useLanguage } from '../lib/i18n'

export default function Login() {
  const navigate = useNavigate()
  const { lang, changeLang } = useLanguage()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // 🔄 状态管理
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false) // ✨ 新增：找回密码模式
  const [resetSent, setResetSent] = useState(false)

  // 监听登录状态
  useEffect(() => {
    // 1. 检查当前网址是否包含 type=recovery (说明是从重置密码邮件点进来的)
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      // 这种情况下 Supabase 会自动处理 Session，我们只需要让他进首页即可
      navigate('/') 
    }

    // 2. 监听常规登录
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) navigate('/')
      if (event === 'PASSWORD_RECOVERY') navigate('/') // 捕捉重置密码事件
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      // 📝 注册
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) alert(error.message)
      else {
        alert(lang === 'zh' ? '注册成功！请去邮箱点击验证链接。' : 'Success! Check email to confirm.')
        setIsSignUp(false)
      }
    } else {
      // 🔑 登录
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(lang === 'zh' ? '登录失败：账号或密码错误' : error.message)
      else navigate('/')
    }
    setLoading(false)
  }

  // 📨 发送重置密码邮件
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // 登录后跳回首页
    })
    
    if (error) {
      alert(error.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  const handleGuestLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInAnonymously()
    if (error) alert(error.message)
    else navigate('/')
    setLoading(false)
  }

  // ----------------------------------------------------
  // 渲染部分
  // ----------------------------------------------------

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* 语言切换 */}
      <div className="absolute top-6 right-6 flex gap-3 text-sm font-bold text-gray-300">
        <button onClick={() => changeLang('zh')} className={`hover:text-black transition-colors ${lang === 'zh' ? 'text-black' : ''}`}>CN</button>
        <button onClick={() => changeLang('en')} className={`hover:text-black transition-colors ${lang === 'en' ? 'text-black' : ''}`}>EN</button>
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-black text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
             <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-1">Memory Flow</h1>
          <p className="text-gray-500 font-medium">
            {isForgotPassword 
              ? (lang === 'zh' ? '重置密码' : 'Reset Password')
              : (isSignUp 
                  ? (lang === 'zh' ? '创建新账号' : 'Create an account') 
                  : (lang === 'zh' ? '欢迎回来' : 'Welcome back'))
            }
          </p>
        </div>

        {/* 🆘 找回密码界面 */}
        {isForgotPassword ? (
           resetSent ? (
            <div className="bg-green-50 p-8 rounded-3xl text-center border border-green-100 animate-in fade-in zoom-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Mail className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">邮件已发送</h3>
              <p className="text-gray-600 mb-6">请检查您的邮箱 <strong>{email}</strong><br/>点击链接即可登录并重置密码。</p>
              <button onClick={() => {setResetSent(false); setIsForgotPassword(false)}} className="text-sm text-gray-400 underline hover:text-green-600">返回登录</button>
            </div>
           ) : (
            <div className="space-y-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative group">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-4 group-focus-within:text-indigo-600 transition-colors" />
                  <input type="email" placeholder="输入您的注册邮箱" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black pl-12 pr-4 py-4 rounded-2xl outline-none font-medium transition-all text-gray-900" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button disabled={loading} className="w-full bg-black text-white p-4 rounded-2xl font-bold text-lg hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><span>发送重置链接</span><KeyRound className="w-5 h-5" /></>)}
                </button>
              </form>
              <button onClick={() => setIsForgotPassword(false)} className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-black py-2"><ArrowLeft className="w-4 h-4" /> <span>返回登录</span></button>
            </div>
           )
        ) : (
          // 🚪 正常 登录/注册 界面
          <div className="space-y-6">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="relative group">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-4 transition-colors" />
                  <input type="email" placeholder="Email" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black pl-12 pr-4 py-4 rounded-2xl outline-none font-medium transition-all text-gray-900" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="relative group">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-4 transition-colors" />
                  <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black pl-12 pr-12 py-4 rounded-2xl outline-none font-medium transition-all text-gray-900" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-black">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                </div>
                
                {/* ✨ 忘记密码入口 (只在登录模式显示) */}
                {!isSignUp && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm font-bold text-gray-400 hover:text-black transition-colors">
                      {lang === 'zh' ? '忘记密码？' : 'Forgot password?'}
                    </button>
                  </div>
                )}

                <button disabled={loading} className="w-full bg-black text-white p-4 rounded-2xl font-bold text-lg hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><span>{isSignUp ? (lang === 'zh' ? '注册' : 'Sign Up') : (lang === 'zh' ? '登录' : 'Log In')}</span><ArrowRight className="w-5 h-5" /></>)}
                </button>
              </form>

              <div className="text-center">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-gray-500 font-medium hover:text-black underline transition-colors">
                  {isSignUp ? (lang === 'zh' ? '已有账号？去登录' : 'Already have an account? Log in') : (lang === 'zh' ? '没有账号？去注册' : "Don't have an account? Sign up")}
                </button>
              </div>

              <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-100"></div><span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold uppercase tracking-wider">Or</span><div className="flex-grow border-t border-gray-100"></div></div>
              
              <button onClick={handleGuestLogin} disabled={loading} className="w-full bg-white text-gray-600 border-2 border-gray-100 p-4 rounded-2xl font-bold hover:border-gray-300 hover:text-black transition-all flex items-center justify-center gap-2">
                <Fingerprint className="w-5 h-5" />
                <span>{lang === 'zh' ? '游客试用' : 'Guest Trial'}</span>
              </button>
          </div>
        )}
      </div>
    </div>
  )
}