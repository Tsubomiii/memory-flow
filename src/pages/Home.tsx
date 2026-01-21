import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, CheckCircle2, Clock, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../lib/i18n' // 引入刚才写的翻译工具

interface Note {
  id: number
  content: string
  created_at: string
  review_stage: number
  next_review_at: string
}

// 🧠 艾宾浩斯复习间隔 (天)
const REVIEW_INTERVALS = [1, 3, 7, 14, 30]

export default function Home() {
  const { lang, changeLang, t } = useLanguage() // 获取当前语言和翻译
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  // 控制语言菜单的显示/隐藏
  const [showLangMenu, setShowLangMenu] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching notes:', error)
    else setNotes(data || [])
    setLoading(false)
  }

  // ✅ 复习打卡逻辑
  const handleReview = async (note: Note) => {
    const nextStage = note.review_stage + 1
    const daysToAdd = REVIEW_INTERVALS[note.review_stage] || 30
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + daysToAdd)

    // 乐观更新 UI (让用户觉得不用等)
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

  // 🕵️ 筛选：哪些是今天该复习的？
  const now = new Date()
  const dueNotes = notes.filter(n => new Date(n.next_review_at) <= now)
  // 其他笔记（非复习）
  const otherNotes = notes.filter(n => new Date(n.next_review_at) > now)

  if (loading) return <div className="p-10 text-center text-gray-400">{t.loading}</div>

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24 space-y-8 min-h-screen">
      
      {/* 顶部栏：标题 + 语言切换 */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t.app_title}</h1>
        
        {/* 语言切换器 */}
        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <Globe className="w-5 h-5" />
          </button>
          
          {/* 下拉菜单 */}
          {showLangMenu && (
            <div className="absolute right-0 top-12 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden w-32 z-50">
              <button onClick={() => {changeLang('en'); setShowLangMenu(false)}} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${lang === 'en' ? 'font-bold text-indigo-600' : ''}`}>English</button>
              <button onClick={() => {changeLang('zh'); setShowLangMenu(false)}} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${lang === 'zh' ? 'font-bold text-indigo-600' : ''}`}>中文</button>
              <button onClick={() => {changeLang('ja'); setShowLangMenu(false)}} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${lang === 'ja' ? 'font-bold text-indigo-600' : ''}`}>日本語</button>
            </div>
          )}
        </div>
      </header>

      {/* 🔴 复习区域 (有任务才显示) */}
      {dueNotes.length > 0 ? (
        <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <Clock className="w-5 h-5" />
            <h2>{t.review_section} ({dueNotes.length})</h2>
          </div>
          
          <div className="grid gap-3">
            {dueNotes.map(note => (
              <div key={note.id} className="bg-white border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-sm flex justify-between items-start gap-3 group">
                <p className="text-gray-800 flex-1 whitespace-pre-wrap">{note.content}</p>
                <button 
                  onClick={() => handleReview(note)}
                  className="text-gray-300 hover:text-green-500 transition-colors"
                  title="Mark as Reviewed"
                >
                  <CheckCircle2 className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        // 如果没有复习任务，显示一个小小的提示
        <div className="text-center py-4 bg-green-50 rounded-xl text-green-700 text-sm font-medium opacity-80">
          {t.empty_review}
        </div>
      )}

      {/* ⚫️ 所有记忆列表 */}
      <section className="space-y-4">
        <h2 className="text-gray-400 font-bold text-sm uppercase tracking-wider ml-1">{t.all_memories}</h2>
        <div className="grid gap-3">
          {otherNotes.map(note => (
            <div key={note.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start gap-3 group">
              <p className="text-gray-600 flex-1 text-sm whitespace-pre-wrap">{note.content}</p>
              <button 
                onClick={() => handleDelete(note.id)}
                className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 悬浮按钮 */}
      <Link to="/input" className="fixed bottom-8 right-8 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95">
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  )
}