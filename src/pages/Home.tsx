import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Trash2, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotes()
  }, [])

  async function fetchNotes() {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 🗑️ 新增：删除功能
  async function handleDelete(id: number) {
    if (!window.confirm('确定要删除这条笔记吗？')) return

    // 1. 在界面上先删掉（让用户感觉很快）
    setNotes(notes.filter(n => n.id !== id))

    // 2. 去数据库真删
    const { error } = await supabase.from('notes').delete().eq('id', id)
    
    // 如果删失败了，再把数据加回来（这里偷懒先不写回滚，通常不会失败）
    if (error) {
      alert('删除失败，请刷新页面')
      fetchNotes()
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto min-h-screen pb-20">
      <header className="text-center mt-10 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">MemoryFlow</h1>
        <p className="text-gray-400 mt-2 text-sm">捕捉想法 · 回顾记忆</p>
      </header>

      <div className="grid gap-4 mb-10">
        <Link to="/input" className="flex items-center p-6 bg-gray-900 text-white rounded-xl shadow-xl hover:bg-black transition transform active:scale-95">
          <PlusCircle className="w-8 h-8 mr-4" />
          <div className="text-left">
            <div className="font-bold text-lg">记一条</div>
            <div className="text-gray-400 text-sm">记录此刻的想法</div>
          </div>
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center mb-4">
          <Clock className="w-4 h-4 mr-2" />
          最近记录
        </h2>

        {loading ? (
          <div className="text-center py-10 text-gray-300 animate-pulse">加载数据中...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400">还没有笔记</p>
            <Link to="/input" className="text-blue-500 font-bold mt-2 inline-block">去写第一条</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="group relative p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-gray-800 text-lg whitespace-pre-wrap leading-relaxed">{note.content}</p>
                
                <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-50">
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  
                  {/* 删除按钮：平时隐藏，鼠标悬停时显示 */}
                  <button 
                    onClick={() => handleDelete(note.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}