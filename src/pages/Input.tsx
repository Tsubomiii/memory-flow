import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { useLanguage } from '../lib/i18n' // 引入

export default function Input() {
  const { t } = useLanguage() // 获取翻译
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSubmitting(true)
    const { error } = await supabase.from('notes').insert([{ content }])

    if (!error) navigate('/')
    else setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="p-4 flex items-center bg-white shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg ml-2">{t.save}</span>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
        <textarea
          className="flex-1 w-full bg-transparent resize-none outline-none text-lg text-gray-800 placeholder:text-gray-300"
          placeholder={t.input_placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />

        <button 
          disabled={!content.trim() || isSubmitting}
          className="mt-6 w-full bg-black text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : t.save}
        </button>
      </form>
    </div>
  )
}