import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, CheckCircle2, Clock, Globe, AlertTriangle, Send, Loader2, LogOut } from 'lucide-react'
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
  
  const [newContent, setNewContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    checkUser()
    fetchNotes()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.is_anonymous) setIsAnonymous(true)
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

  const handleAddFirstNote = async () => {
    if (!newContent.trim()) return
    setIsSubmitting(true)
    
    const { data, error } = await supabase
      .from('notes')
      .insert([{ content: newContent }])
      .select()

    if (!error && data) {
      const newNote = data[0] as Note
      setNotes([newNote, ...notes])
      setNewContent('') 
    } else {
      alert('Error saving note')
    }
    setIsSubmitting(false)
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
    setNotes(prev => prev.filter(n => n.id !== id))
    await supabase.from('notes').delete().eq('id', id)
  }

  const handleLogout = async () => {
    if (isAnonymous) {
      if (!confirm(lang === 'zh' ? '警告：作为游客退出后，您的笔记可能会丢失！确定要退出吗？' : 'Warning: Guest data may be lost upon logout. Continue?')) return
    }
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      navigate('/login')
      window.location.reload()
    }
  }

  const now = new Date()
  const dueNotes = notes.filter(n => new Date(n.next_review_at) <= now)
  const otherNotes = notes.filter(n => new Date(n.next_review_at) > now)

  if (loading) return <div className="p-10 text-center text-gray-400">{t.loading}</div>

  const isEmptyState = notes.length === 0;

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-gray-50 relative pb-32">
      
      {/* ⚠️ 游客警告条 */}
      {isAnonymous && (
        <div className="bg-orange-50 border-b border-orange-100 p-3 px-6 flex items-start gap-3 animate-in slide-in-from-top duration-300">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-orange-800 font-medium">
              {lang === 'zh' ? '游客模式运行中' : lang === 'ja' ? 'ゲストモードで使用中' : 'Guest Mode Active'}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              {lang === 'zh' ? '数据仅保存在本机。' : 'Data is local only.'}
            </p>
          </div>
          <button onClick={handleLogout} className="text-xs bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-100 whitespace-nowrap">
             {lang === 'zh' ? '去注册' : 'Register'}
          </button>
        </div>
      )}

      <div className="p-6 space-y-8">
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
            {/* 🚪 Logout */}
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Logout">
               <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 🔀 动态区域 */}
        {isEmptyState ? (
          <div className="flex flex-col items-center justify-center pt-10 animate-in fade-in zoom-in duration-500">
             <div className="w-full bg-white p-6 rounded-3xl shadow-lg border border-indigo-50">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {lang === 'zh' ? '👋 欢迎！写下你的第一条记忆...' : lang === 'ja' ? '👋 ようこそ！最初の記憶を書き留めましょう...' : '👋 Welcome! Capture your first memory...'}
                </h3>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={t.input_placeholder}
                  className="w-full resize-none outline-none text-gray-800 placeholder:text-gray-300 min-h-[120px] text-lg bg-transparent"
                  autoFocus
                />
                <div className="flex justify-end mt-4">
                   <button 
                     onClick={handleAddFirstNote}
                     disabled={!newContent.trim() || isSubmitting}
                     className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all shadow-md hover:shadow-xl hover:-translate-y-1"
                   >
                     {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                     {t.save}
                   </button>
                </div>
             </div>
             <p className="mt-8 text-gray-400 text-sm text-center max-w-xs leading-relaxed">
               {lang === 'zh' 
                 ? 'Memory Flow 会根据遗忘曲线，在最合适的时候提醒你复习这条笔记。' 
                 : 'Memory Flow uses the forgetting curve to remind you to review at the perfect time.'}
             </p>
          </div>
        ) : (
          <>
            {dueNotes.length > 0 && (
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
            )}

            <section className="space-y-4 animate-in fade-in duration-500 delay-150">
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

            <Link to="/input" className="fixed bottom-8 right-8 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 z-50">
              <Plus className="w-6 h-6" />
            </Link>
          </>
        )}
      </div>
    </div>
  )
}