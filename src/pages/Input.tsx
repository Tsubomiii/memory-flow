import { useState, useRef, MouseEvent, TouchEvent, useEffect } from 'react' // 引入 TouchEvent
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { Loader2, ArrowLeft, ImagePlus, X, Undo2, Trash2, User } from 'lucide-react'

// ... Mask 类型 ...
type Mask = { id: number; x: number; y: number; width: number; height: number }

export default function Input() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [masks, setMasks] = useState<Mask[]>([])
  const [selectedMaskId, setSelectedMaskId] = useState<number | null>(null)
  const [isGuest, setIsGuest] = useState(false)

  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState<Mask | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user?.is_anonymous) setIsGuest(true) })
  }, [])

  // --- ⭐️ 修改点：绘图逻辑 (统一鼠标和触摸) ---
  const getPointFromEvent = (e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as MouseEvent).clientX
      clientY = (e as MouseEvent).clientY
    }

    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x, y }
  }

  const handleDrawStart = (e: MouseEvent | TouchEvent) => {
    // 触摸开始时，不阻止默认行为以允许可能的点击，但如果是在画图区域，后续Move会阻止
    setSelectedMaskId(null)
    setIsDrawing(true)
    const pos = getPointFromEvent(e)
    setStartPos(pos)
    setCurrentRect({ id: Date.now(), x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  const handleDrawMove = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing || !currentRect) return
    e.preventDefault() // ⭐️ 关键：防止手机拖动时滚动页面
    const pos = getPointFromEvent(e)
    const x = Math.min(pos.x, startPos.x)
    const y = Math.min(pos.y, startPos.y)
    const width = Math.abs(pos.x - startPos.x)
    const height = Math.abs(pos.y - startPos.y)
    setCurrentRect({ ...currentRect, x, y, width, height })
  }

  const handleDrawEnd = () => {
    if (isDrawing && currentRect && currentRect.width > 1 && currentRect.height > 1) {
      setMasks([...masks, currentRect])
    }
    setIsDrawing(false)
    setCurrentRect(null)
  }

  const handleDeleteSelected = () => { if (selectedMaskId) { setMasks(masks.filter(m => m.id !== selectedMaskId)); setSelectedMaskId(null) } }
  const handleUndo = () => { setMasks(masks.slice(0, -1)); setSelectedMaskId(null) }
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { if (file.size > 5 * 1024 * 1024) { alert("Image too large (max 5MB)"); return } setImageFile(file); setImagePreviewUrl(URL.createObjectURL(file)); setMasks([]); setSelectedMaskId(null) } }
  const clearImage = () => { setImageFile(null); if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); setImagePreviewUrl(null); setMasks([]); setSelectedMaskId(null); if (fileInputRef.current) fileInputRef.current.value = '' }
  const handleSave = async () => { if (!title.trim() && !body.trim() && !imageFile) return; setIsSaving(true); try { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('No user'); let uploadedImageUrl = null; if (imageFile) { const fileExt = imageFile.name.split('.').pop(); const fileName = `${user.id}/${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('note-images').upload(fileName, imageFile); if (uploadError) throw uploadError; const { data: { publicUrl } } = supabase.storage.from('note-images').getPublicUrl(fileName); uploadedImageUrl = publicUrl } const finalTitle = title.trim() || format(new Date(), 'yyyy/MM/dd HH:mm'); const { error } = await supabase.from('notes').insert([{ title: finalTitle, body: body.trim(), image_url: uploadedImageUrl, masks: masks, next_review: new Date().toISOString(), review_stage: 0, user_id: user.id }]); if (error) throw error; navigate('/') } catch (error: any) { console.error(error); alert(`Failed to save: ${error.message}`) } finally { setIsSaving(false) } }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {isGuest && (
        <div className="sticky top-0 z-40 bg-orange-50 border-b border-orange-100 px-6 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2"><User size={16} className="text-orange-400" /><span className="text-xs font-bold text-orange-600 tracking-wide">Guest Mode: Data lost on exit</span></div>
          <span className="text-[10px] text-orange-400 font-medium">Local Data</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-6 pt-8">
        <div className="flex items-center gap-4 mb-8"><button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} className="text-gray-600" /></button><h1 className="text-3xl font-black text-gray-900 tracking-tighter">New Memory</h1></div>
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200 flex flex-col gap-6">
          <div><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} placeholder="Title (Optional, Defaults to time if empty)" className="w-full outline-none text-2xl font-bold text-gray-900 bg-transparent placeholder:text-gray-300 border-b border-gray-500 pb-3"/></div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Text" className="w-full h-[15vh] resize-none outline-none text-lg text-gray-800 bg-transparent placeholder:text-gray-300 font-normal leading-relaxed"/>
          
          <div>
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
            {!imagePreviewUrl ? (
               <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors bg-gray-50 hover:bg-gray-100 px-4 py-3 rounded-xl w-full justify-center border border-dashed border-gray-200"><ImagePlus size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Add Image</span></button>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-orange-500 uppercase tracking-widest animate-pulse">{selectedMaskId ? "Mask Selected" : "Draw masks on image"}</span>
                  <div className="flex gap-2">{selectedMaskId ? (<button onClick={handleDeleteSelected} className="p-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-600 flex items-center gap-1 text-xs font-bold transition-colors"><Trash2 size={14}/> Delete</button>) : (<button onClick={handleUndo} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 flex items-center gap-1 text-xs font-bold transition-colors"><Undo2 size={14}/> Undo</button>)}<button onClick={clearImage} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg text-gray-600 transition-colors"><X size={16}/></button></div>
                </div>

                {/* ⭐️ 修改点：绑定 Touch 事件 */}
                <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-gray-200 select-none touch-none cursor-crosshair"
                  onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd}
                  onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd} // 👈
                >
                  <img ref={imageRef} src={imagePreviewUrl} alt="Preview" className="w-full h-auto object-contain pointer-events-none" />
                  {masks.map(mask => { const isSelected = mask.id === selectedMaskId; return (<div key={mask.id} onMouseDown={(e) => { e.stopPropagation(); setSelectedMaskId(mask.id); }} onTouchStart={(e) => { e.stopPropagation(); setSelectedMaskId(mask.id); }} className={`absolute bg-orange-500/50 cursor-pointer transition-all ${isSelected ? 'border-2 border-red-600 z-10' : 'border border-orange-600'}`} style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }} />) })}
                  {currentRect && (<div className="absolute bg-orange-500/30 border-2 border-orange-500" style={{ left: `${currentRect.x}%`, top: `${currentRect.y}%`, width: `${currentRect.width}%`, height: `${currentRect.height}%` }} />)}
                </div>
                <p className="text-center text-xs text-gray-400">{selectedMaskId ? "Click 'Delete' to remove selected mask" : "Click and drag to hide answers. Click a mask to select it."}</p>
              </div>
            )}
          </div>
        </div>
        <button onClick={handleSave} disabled={isSaving || (!title.trim() && !body.trim() && !imageFile)} className={`mt-8 w-full py-5 rounded-2xl flex items-center justify-center font-bold text-base tracking-wider uppercase transition-all shadow-lg ${isSaving ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-black text-white hover:bg-gray-800 hover:scale-[1.01] active:scale-95'}`}>{isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : 'Save Note'}</button>
      </div>
    </div>
  )
}