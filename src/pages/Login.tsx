import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Fingerprint, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // State
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  
  // Link Processing State
  const [isProcessingLink, setIsProcessingLink] = useState(false)

  useEffect(() => {
    // 1. Check for Magic Link Hash
    const hash = window.location.hash
    if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
      setIsProcessingLink(true)
    }

    // 2. Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
        if (session) {
          setIsProcessingLink(false)
          navigate('/') 
        }
      }
      
      if (event === 'SIGNED_OUT' && !window.location.hash) {
        setIsProcessingLink(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      // Sign Up
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) {
        alert(error.message)
      } else {
        alert('Success! Please check your email to confirm.')
        setIsSignUp(false)
      }
    } else {
      // Sign In
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        alert(error.message)
      } else {
        navigate('/')
      }
    }
    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
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

  // Loading Screen (Processing Link)
  if (isProcessingLink) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">Verifying...</h2>
        <p className="text-gray-500 max-w-xs mx-auto mb-8">
          Please wait while we log you in.
        </p>
        <button onClick={() => { setIsProcessingLink(false); navigate('/') }} className="text-xs text-gray-300 underline hover:text-red-500">
          Stuck? Click to refresh
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* ✨ 之前的 Language Switcher 代码已经被彻底移除了 ✨ */}

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-black text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
             <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-1">Memory Flow</h1>
          <p className="text-gray-500 font-medium">
            {isForgotPassword 
              ? 'Reset Password'
              : (isSignUp ? 'Create Account' : 'Welcome Back')
            }
          </p>
        </div>

        {/* Form Area */}
        {isForgotPassword ? (
           resetSent ? (
            <div className="bg-green-50 p-8 rounded-3xl text-center border border-green-100">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Mail className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check Email</h3>
              <p className="text-gray-600 mb-6">We sent a reset link to <strong>{email}</strong>.</p>
              <button onClick={() => {setResetSent(false); setIsForgotPassword(false)}} className="text-sm text-gray-400 underline hover:text-green-600">Back to Login</button>
            </div>
           ) : (
            <div className="space-y-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative group">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-4" />
                  <input type="email" placeholder="Enter your email" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black pl-12 pr-4 py-4 rounded-2xl outline-none font-medium text-gray-900" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button disabled={loading} className="w-full bg-black text-white p-4 rounded-2xl font-bold text-lg hover:bg-gray-800 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><span>Send Reset Link</span><KeyRound className="w-5 h-5" /></>)}
                </button>
              </form>
              <button onClick={() => setIsForgotPassword(false)} className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-black py-2"><ArrowLeft className="w-4 h-4" /> <span>Back to Login</span></button>
            </div>
           )
        ) : (
          <div className="space-y-6">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="relative group">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-4" />
                  <input type="email" placeholder="Email" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black pl-12 pr-4 py-4 rounded-2xl outline-none font-medium text-gray-900" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="relative group">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-4" />
                  <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black pl-12 pr-12 py-4 rounded-2xl outline-none font-medium text-gray-900" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-black">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {!isSignUp && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm font-bold text-gray-400 hover:text-black">
                      Forgot Password?
                    </button>
                  </div>
                )}

                <button disabled={loading} className="w-full bg-black text-white p-4 rounded-2xl font-bold text-lg hover:bg-gray-800 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><span>{isSignUp ? 'Sign Up' : 'Log In'}</span><ArrowRight className="w-5 h-5" /></>)}
                </button>
              </form>

              <div className="text-center">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-gray-500 font-medium hover:text-black underline">
                  {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                </button>
              </div>

              <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-100"></div><span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold uppercase tracking-wider">Or</span><div className="flex-grow border-t border-gray-100"></div></div>
              
              <button onClick={handleGuestLogin} disabled={loading} className="w-full bg-white text-gray-600 border-2 border-gray-100 p-4 rounded-2xl font-bold hover:border-gray-300 hover:text-black transition-all flex items-center justify-center gap-2">
                <Fingerprint className="w-5 h-5" />
                <span>Guest Trial</span>
              </button>
          </div>
        )}
      </div>
    </div>
  )
}