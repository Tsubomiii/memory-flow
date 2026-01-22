import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Image as ImageIcon, Eraser, Save, Loader2, Type, AlignLeft } from 'lucide-react'

// Types
interface Mask { id: string; x: number; y: number; w: number; h: number }

export default function Input() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  // Input State
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  
  // Image & Drawing State
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [masks, setMasks] = useState<Mask[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const getDefaultTitle = () => {
    const now = new Date()
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  // Image Logic
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { setSelectedImage(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); setMasks([]) } }
  const createMask = (clientX: number, clientY: number) => { if (!imgRef.current) return; const rect = imgRef.current.getBoundingClientRect(); const w = Math.abs((clientX - rect.left) - startPos.x); const h = Math.abs((clientY - rect.top) - startPos.y); if (w > 5 && h > 5) { setMasks([...masks, { id: Date.now().toString(), x: (Math.min(clientX - rect.left, startPos.x) / rect.width) * 100, y: (Math.min(clientY - rect.top, startPos.y) / rect.height) * 100, w: (w / rect.width) * 100, h: (h / rect.height) * 100 }]) } }
  const handleMouseDown = (e: React.MouseEvent) => { if (!imgRef.current) return; const rect = imgRef.current.getBoundingClientRect(); setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); setIsDrawing(true) }
  const handleMouseUp = (e: React.MouseEvent) => { if (!isDrawing) return; createMask(e.clientX, e.clientY); setIsDrawing(false) }
  const handleTouchStart = (e: React.TouchEvent) => { if (!imgRef.current) return; const touch = e.touches[0]; const rect = imgRef.current.getBoundingClientRect(); setStartPos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top }); setIsDrawing(true) }
  const handleTouchEnd = (e: React.TouchEvent) => { if (!isDrawing) return; const touch = e.changedTouches[0]; createMask(touch.clientX, touch.clientY); setIsDrawing(false) }
  const undoMask = () => setMasks(prev => prev.slice(0, -1))

  // Save Logic
  const handleSave = async () => {
    if (!title.trim() && !content.trim() && !selectedImage) return alert('Please enter something')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const finalTitle = title.trim() || getDefaultTitle()

    let url = null
    if (selectedImage) {
      const name = `${Math.random()}.${selectedImage.name.split('.').pop()}`
      await supabase.storage.from('photos').upload(`${user.id}/${name}`, selectedImage)
      url = supabase.storage.from('photos').getPublicUrl(`${user.id}/${name}`).data.publicUrl
    }

    const { error } = await supabase.from('notes').insert([{
      title: finalTitle, 
      content, 
      text_color: 'text-gray-900', 
      image_url: url, 
      masks, 
      review_stage: 0, 
      next_review_at: new Date().toISOString(), 
      user_id: user.id
    }])

    if (error) alert(error.message); else navigate('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="font-bold text-lg">New Memory</h1>
        <button onClick={handleSave} disabled={loading} className="text-indigo-600 font-bold disabled:opacity-50 flex items-center gap-1">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save</>}
        </button>
      </div>

      <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Title */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-3 mb-2">
              <Type className="w-5 h-5 text-gray-400" />
              {/* ✨ 限制 50 字 */}
              <input 
                maxLength={50}
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Title (Optional - Auto Date)" 
                className="w-full text-lg font-bold outline-none placeholder:text-gray-300 text-gray-900" 
              />
           </div>
           {/* ✨ 字数统计 */}
           <div className="text-right text-xs text-gray-300 font-medium">{title.length}/50</div>
        </div>

        {/* Content */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
           <div className="flex gap-3 min-h-[150px]">
              <AlignLeft className="w-5 h-5 text-gray-400 mt-1" />
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Add details..." className="w-full h-full resize-none outline-none bg-transparent leading-relaxed text-lg text-gray-900" style={{ minHeight: '150px' }} />
           </div>
        </div>

        {/* Image Area */}
        {imagePreview ? (
           <div className="relative border-2 border-dashed border-indigo-100 rounded-lg overflow-hidden select-none touch-none bg-white">
             <div className="absolute inset-0 z-10 cursor-crosshair touch-none" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={() => setIsDrawing(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}></div>
             <img ref={imgRef} src={imagePreview} className="w-full h-auto block" />
             {masks.map(mask => (<div key={mask.id} className="absolute bg-orange-500/60 border border-white/50" style={{left:`${mask.x}%`, top:`${mask.y}%`, width:`${mask.w}%`, height:`${mask.h}%`}}></div>))}
             <button onClick={() => {setImagePreview(null); setSelectedImage(null); setMasks([])}} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"><Eraser className="w-4 h-4" /></button>
           </div>
        ) : (
           <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors bg-white">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="font-bold">Add Image (Optional)</span>
           </button>
        )}
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
        {masks.length > 0 && (<div className="flex justify-end"><button onClick={undoMask} className="flex items-center gap-2 text-red-500 font-bold bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100"><Eraser className="w-4 h-4" /> Undo Mask</button></div>)}
      </div>
    </div>
  )
}