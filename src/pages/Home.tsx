import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, CheckCircle2, Clock, Globe, AlertTriangle, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../lib/i18n'

interface Note {
  id: number
  content: string
  created_at: string
  review_stage: number
  next_review_at: string
}

const REVIEW_INTERVALS = [1, 3, 7, 14, 30]

export default function Home() {
  const { lang, changeLang, t } = useLanguage()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showLangMenu, setShowLangMenu] = useState(false)
  
  // 🕵️ 新增：判断是不是游客
  const [isAnonymous, setIsAnonymous] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    checkUser()
    fetchNotes()
  }, [])

  // 1. 检查用户身份
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    // Supabase 的 user 对象里有一个 is_anonymous 属性
    if (user?.is_anonymous) {
      setIsAnonymous(true)
    }
  }

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching notes:', error)
    else setNotes(data || [])
    setLoading(false)
  }

  const handleReview = async (note: Note) => {
    const nextStage = note.review_stage + 1
    const daysToAdd = REVIEW_INTERVALS[note.review_stage] || 30
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + daysToAdd)

    const updatedNotes = notes.map(n => 
      n.id === note.id 
        ? { ...n, review_stage: nextStage, next_review_at: nextDate.toISOString() } 
        : n
    )
    setNotes(updatedNotes)

    await supabase
      .from('notes')
      .update({ review_stage: nextStage, next_review_at: nextDate.toISOString() })
      .eq('id', note.id)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return
    setNotes(notes.filter(n => n.id !== id))
    await supabase.from('notes').delete().eq('id', id)
  }

  // 退出登录 (如果是游客，退出意味着数据可能会丢，这里简单处理)
  const handleLogout = async () => {
    if (isAnonymous) {
      if (!confirm(lang === 'zh' ? '警告：作为游客退出后，您的笔记可能会丢失！确定要退出吗？' : 'Warning: Guest data may be lost upon logout. Continue?')) {
        return
      }
    }
    await supabase.auth.signOut()
    navigate('/login') // 回到登录页
  }

  const now = new Date()
  const dueNotes = notes.filter(n => new Date(n.next_review_at) <= now)
  const otherNotes = notes.filter(n => new Date(n.next_review_at) > now)

  if (loading) return <div className="p-10 text-center text-gray-400">{t.loading}</div>

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-gray-50">
      
      {/* ⚠️ 游客专属警告条 */}
      {isAnonymous && (
        <div className="bg-orange-50 border-b border-orange-100 p-3 px-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-orange-800 font-medium">
              {lang === 'zh' ? '您正在使用游客模式' : lang === 'ja' ? 'ゲストモードで使用中' : 'Guest Mode Active'}
            </p>
            <p className="text-xs text-orange-600 mt-0.5 leading-relaxed">
              {lang === 'zh' 
                ? '注意：笔记仅保存在当前设备。若清除缓存或丢失设备，数据将无法找回。' 
                : lang === 'ja' 
                ? '注意：データは現在のデバイスにのみ保存されます。紛失時の復旧はできません。' 
                : 'Note: Data is local only. It will be lost if you clear cache or lose this device.'}
            </p>
          </div>
          {/* 这里其实可以做一个按钮跳转去绑定邮箱，但为了简单，先让用户知道风险 */}
          <button onClick={handleLogout} className="text-xs bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors whitespace-nowrap">
             {lang === 'zh' ? '去注册保存' : 'Register'}
          </button>
        </div>
      )}

      <div className="p-6 pb-24 space-y-8">
        {/* 顶部栏 */}
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t.app_title}</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowLangMenu(!showLangMenu)} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
                <Globe className="w-5 h-5" />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 top-12 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden w-32 z-50">
                  <button onClick={() => {changeLang('en'); setShowLangMenu(false)}} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50">English</button>
                  <button onClick={() => {changeLang('zh'); setShowLangMenu(false)}} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50">中文</button>
                  <button onClick={() => {changeLang('ja'); setShowLangMenu(false)}} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50">日本語</button>
                </div>
              )}
            </div>
            
            {/* 退出按钮 */}
            {!isAnonymous && (
               <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600 px-2">
                 {lang === 'zh' ? '退出' : 'Logout'}
               </button>
            )}
          </div>
        </header>

        {/* 复习区域 (代码不变) */}
        {dueNotes.length > 0 ? (
          <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
              <Clock className="w-5 h-5" />
              <h2>{t.review_section} ({dueNotes.length})</h2>
            </div>
            <div className="grid gap-3">
              {dueNotes.map(note => (
                <div key={note.id} className="bg-white border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-sm flex justify-between items-start gap-3">
                  <p className="text-gray-800 flex-1 whitespace-pre-wrap">{note.content}</p>
                  <button onClick={() => handleReview(note)} className="text-gray-300 hover:text-green-500 transition-colors"><CheckCircle2 className="w-6 h-6" /></button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-4 bg-green-50 rounded-xl text-green-700 text-sm font-medium opacity-80">{t.empty_review}</div>
        )}

        {/* 列表区域 (代码不变) */}
        <section className="space-y-4">
          <h2 className="text-gray-400 font-bold text-sm uppercase tracking-wider ml-1">{t.all_memories}</h2>
          <div className="grid gap-3">
            {otherNotes.map(note => (
              <div key={note.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start gap-3 group">
                <p className="text-gray-600 flex-1 text-sm whitespace-pre-wrap">{note.content}</p>
                <button onClick={() => handleDelete(note.id)} className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </section>

        <Link to="/input" className="fixed bottom-8 right-8 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95">
          <Plus className="w-6 h-6" />
        </Link>
      </div>
    </div>
  )
}