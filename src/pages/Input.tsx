import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Input() {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSave() {
    if (!content.trim()) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('notes')
        .insert([{ content: content }])

      if (error) throw error
      
      // 保存成功直接跳转，不弹窗了，体验更丝滑
      navigate('/') 

    } catch (err: any) {
      alert('保存失败：' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex items-center mb-6">
        <Link to="/" className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold ml-2">新笔记</h1>
      </div>

      <textarea 
        className="w-full h-48 p-4 text-lg border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:outline-none resize-none bg-gray-50 placeholder:text-gray-400"
        placeholder="记下现在的想法..."
        value={content}
        onChange={(e) => setContent(e.target.value)} 
        autoFocus
      />
      
      <button 
        onClick={handleSave}
        disabled={isSubmitting || !content.trim()}
        className="w-full mt-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            保存中...
          </>
        ) : (
          '保存笔记'
        )}
      </button>
    </div>
  )
}