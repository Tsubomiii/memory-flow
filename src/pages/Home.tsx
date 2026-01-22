import { useEffect, useState, useRef, MouseEvent } from 'react'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow, format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Loader2, Trash2, Edit2, X, Save, Clock, ImagePlus, Undo2, Award } from 'lucide-react'

type Mask = {
  id: number
  x: number
  y: number
  width: number
  height: number
}

type Note = {
  id: number; 
  title?: string;
  body?: string;
  content?: string; 
  image_url?: string;
  masks?: Mask[];
  next_review: string; 
  review_stage: number; 
  created_at: string;
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // 编辑状态
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editMasks, setEditMasks] = useState<Mask[]>([])
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedMaskId, setSelectedMaskId] = useState<number | null>(null)

  // 绘图状态
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState<Mask | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 复习状态
  const [revealedMaskIds, setRevealedMaskIds] = useState<number[]>([])
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const fetchNotes = async () => {
    setLoading(true)
    const { data } = await supabase.from('notes').select('*').order('next_review', { ascending: true })
    if (data) setNotes(data)
    setLoading(false)
  }

  useEffect(() => { fetchNotes() }, [])

  // --- 记忆曲线 (天) ---
  const intervals = [
    24 * 60,      // Stage 1: 1天
    2 * 24 * 60,  // Stage 2: 2天
    4 * 24 * 60,  // Stage 3: 4天
    7 * 24 * 60,  // Stage 4: 7天
    15 * 24 * 60, // Stage 5: 15天
    30 * 24 * 60  // Stage 6: 30天
  ]

  const now = new Date()
  
  const masteredNotes = notes.filter(n => n.review_stage >= 7)
  const activeNotes = notes.filter(n => n.review_stage < 7)
  const dueNotes = activeNotes.filter(n => new Date(n.next_review) <= now)
  const futureNotes = activeNotes.filter(n => new Date(n.next_review) > now)

  const getDisplayContent = (note: Note) => {
    const title = note.title || format(new Date(note.created_at), 'yyyy/MM/dd HH:mm')
    const body = note.body || note.content || ""
    return { title, body }
  }

  const getPreviewText = (note: Note) => {
    const { body } = getDisplayContent(note);
    if (body && body.trim().length > 0) {
      return body.split('\n')[0];
    }
    if (note.image_url) {
      return "[Image]";
    }
    return "Tap to review...";
  }

  // --- 点击 Remember 核心逻辑 (新增打卡功能) ---
  const handleRemember = async (note: Note) => {
    const currentStage = note.review_stage
    let nextStage = currentStage + 1
    let nextReview = new Date()

    // 1. 计算下次复习时间
    if (currentStage >= intervals.length) { 
        nextStage = 7 // 毕业
        nextReview = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000) 
    } else {
        const minutesToAdd = intervals[currentStage]
        nextReview = new Date(now.getTime() + minutesToAdd * 60 * 1000)
    }

    // 2. 更新笔记状态
    await supabase.from('notes').update({ 
        review_stage: nextStage, 
        next_review: nextReview.toISOString() 
    }).eq('id', note.id)

    // 3. ⭐️ 新增：插入一条复习打卡记录 (Study Log)
    await supabase.from('study_logs').insert({
        note_id: note.id,
        // user_id 会由 Supabase 自动填入
        // created_at 默认为 now()
    })
    
    closeModal()
    fetchNotes()
  }

  const handleForgot = () => closeModal()

  const closeModal = () => {
    setSelectedNote(null)
    setRevealedMaskIds([])
    setEditImagePreview(null)
    setEditImageFile(null)
    setEditMasks([])
    setSelectedMaskId(null)
  }

  // --- 绘图与编辑逻辑 ---
  const getPercentagePos = (e: MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x, y }
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (!isEditing) return
    setSelectedMaskId(null)
    e.preventDefault()
    setIsDrawing(true)
    const pos = getPercentagePos(e)
    setStartPos(pos)
    setCurrentRect({ id: Date.now(), x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDrawing || !currentRect) return
    const pos = getPercentagePos(e)
    const x = Math.min(pos.x, startPos.x)
    const y = Math.min(pos.y, startPos.y)
    const width = Math.abs(pos.x - startPos.x)
    const height = Math.abs(pos.y - startPos.y)
    setCurrentRect({ ...currentRect, x, y, width, height })
  }

  const handleMouseUp = () => {
    if (isDrawing && currentRect && currentRect.width > 1 && currentRect.height > 1) {
      setEditMasks([...editMasks, currentRect])
    }
    setIsDrawing(false)
    setCurrentRect(null)
  }

  const handleDeleteSelectedMask = () => {
    if (selectedMaskId) {
        setEditMasks(editMasks.filter(m => m.id !== selectedMaskId))
        setSelectedMaskId(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedNote) return
    setIsSavingEdit(true)
    try {
      let imageUrl = selectedNote.image_url

      if (editImageFile) {
         const { data: { user } } = await supabase.auth.getUser()
         if (user) {
            const fileExt = editImageFile.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}_edit.${fileExt}`
            await supabase.storage.from('note-images').upload(fileName, editImageFile)
            const { data } = supabase.storage.from('note-images').getPublicUrl(fileName)
            imageUrl = data.publicUrl
         }
      }

      const updates = { 
        title: editTitle.trim() || null, 
        body: editBody.trim(),
        image_url: imageUrl,
        masks: editMasks
      }
      
      await supabase.from('notes').update(updates).eq('id', selectedNote.id)
      
      setNotes(notes.map(n => n.id === selectedNote.id ? { ...n, ...updates } : n))
      setSelectedNote({ ...selectedNote, ...updates })
      setIsEditing(false)
      setEditImageFile(null)
      setEditImagePreview(null)
      setSelectedMaskId(null)
    } catch (error) {
      alert("Failed to save edit")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this note?')) return
    await supabase.from('notes').delete().eq('id', id)
    closeModal()
    fetchNotes()
  }

  const openNote = (note: Note) => {
    const { title, body } = getDisplayContent(note)
    setSelectedNote(note)
    setEditTitle(note.title || '')
    setEditBody(body)
    setEditMasks(note.masks || [])
    setIsEditing(false)
    setRevealedMaskIds([])
    setSelectedMaskId(null)
  }

  const toggleMask = (id: number) => {
    if (revealedMaskIds.includes(id)) {
      setRevealedMaskIds(revealedMaskIds.filter(mid => mid !== id))
    } else {
      setRevealedMaskIds([...revealedMaskIds, id])
    }
  }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-gray-900" /></div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 pt-12 pb-32">
      <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-8">Memory Flow</h1>

      {/* NOW Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-blue-600" />
          <h2 className="text-xl font-bold text-blue-600 tracking-tight">Review Due ({dueNotes.length})</h2>
        </div>
        <div className="space-y-4">
          {dueNotes.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200"><p className="text-gray-400 font-medium">All caught up!</p></div>
          ) : (
            dueNotes.map(note => {
              const { title } = getDisplayContent(note)
              const previewText = getPreviewText(note)
              return (
              <div key={note.id} onClick={() => openNote(note)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all cursor-pointer group">
                <div className="flex-1 min-w-0 mr-6">
                  <h3 className="text-gray-900 font-bold text-lg mb-1 truncate">{title}</h3>
                  <p className="text-gray-400 text-sm truncate font-medium opacity-60">{previewText}</p>
                </div>
                <div className="shrink-0 bg-blue-50 px-4 py-1.5 rounded-full group-hover:bg-blue-100 transition-colors"><span className="text-sm font-bold text-blue-600">Now</span></div>
              </div>
            )})
          )}
        </div>
      </section>

      {/* FUTURE Section */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 mb-4 tracking-widest uppercase pl-1">Tomorrow & Beyond</h2>
        <div className="space-y-4">
          {futureNotes.map(note => {
             const { title } = getDisplayContent(note)
             return (
            <div key={note.id} onClick={() => openNote(note)} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-gray-200 transition-all cursor-pointer">
              <div className="flex-1 min-w-0 mr-6">
                <h3 className="text-gray-800 font-semibold text-lg truncate">{title}</h3>
              </div>
              <div className="shrink-0 bg-orange-50 px-3 py-1.5 rounded-full">
                <span className="text-sm font-bold text-orange-400">{formatDistanceToNow(new Date(note.next_review), { locale: enUS }).replace('about ', '')}</span>
              </div>
            </div>
          )})}
        </div>
      </section>

      {/* MASTERED Section */}
      {masteredNotes.length > 0 && (
        <section className="pt-8 border-t border-gray-100">
           <div className="flex items-center gap-2 mb-4 opacity-50">
             <Award size={16} className="text-gray-400" />
             <h2 className="text-sm font-bold text-gray-400 tracking-widest uppercase">Mastered ({masteredNotes.length})</h2>
           </div>
           <div className="space-y-2 opacity-40 hover:opacity-100 transition-opacity duration-300">
             {masteredNotes.map(note => {
                const { title } = getDisplayContent(note)
                return (
                 <div key={note.id} onClick={() => openNote(note)} className="bg-gray-50 px-6 py-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-100">
                   <h3 className="text-gray-500 font-medium text-sm truncate">{title}</h3>
                   <span className="text-[10px] font-bold text-gray-300 uppercase">Done</span>
                 </div>
             )})}
           </div>
        </section>
      )}

      {/* 弹窗 */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg shadow-2xl rounded-3xl flex flex-col max-h-[80vh] overflow-hidden relative">
            
            <div className="px-4 py-2 flex justify-between items-center border-b border-gray-100 bg-gray-50/50 shrink-0 z-10">
              <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
              <div className="flex gap-2">
                {isEditing ? (
                  <button onClick={handleSaveEdit} disabled={isSavingEdit} className="text-xs font-bold bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-800 disabled:opacity-50">
                    {isSavingEdit ? <Loader2 className="animate-spin" size={14}/> : <><Save size={14}/> SAVE</>}
                  </button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><Edit2 size={18} className="text-gray-500" /></button>
                )}
                <button onClick={() => handleDelete(selectedNote.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} className="text-gray-300 hover:text-red-500" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                     <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={50} placeholder="Title (Optional, Defaults to time if empty)" 
                       // 修正点：深灰分割线 border-gray-500
                       className="w-full text-xl font-bold outline-none border-b border-gray-500 pb-2" />
                  </div>
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="What do you want to remember?" className="w-full h-40 p-0 outline-none resize-none text-lg text-gray-800 leading-relaxed font-normal" />
                  <div>
                    <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if(file) { setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)); setEditMasks([]); setSelectedMaskId(null); } }} accept="image/*" className="hidden" />
                    <div className="flex justify-between items-center mb-2">
                       <button onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-blue-600 hover:underline flex gap-1 items-center"><ImagePlus size={16}/> {selectedNote.image_url ? 'Change Image' : 'Add Image'}</button>
                       <div className="flex gap-2">
                        {selectedMaskId ? (
                          <button onClick={handleDeleteSelectedMask} className="text-xs font-bold text-red-500 hover:text-red-700 flex gap-1 items-center bg-red-50 px-2 py-1 rounded transition-colors"><Trash2 size={12}/> Delete Mask</button>
                        ) : (
                          <button onClick={() => setEditMasks(editMasks.slice(0, -1))} className="text-xs font-bold text-gray-500 hover:text-black flex gap-1 items-center bg-gray-100 px-2 py-1 rounded transition-colors"><Undo2 size={12}/> Undo Last</button>
                        )}
                       </div>
                    </div>
                    {(editImagePreview || selectedNote.image_url) && (
                      <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-gray-200 cursor-crosshair touch-none select-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                         <img src={editImagePreview || selectedNote.image_url || ''} alt="Preview" className="w-full h-auto object-contain pointer-events-none" />
                         {editMasks.map(mask => {
                            const isSelected = mask.id === selectedMaskId;
                            return (<div key={mask.id} onMouseDown={(e) => { e.stopPropagation(); setSelectedMaskId(mask.id); }} className={`absolute bg-orange-500/50 cursor-pointer transition-all ${isSelected ? 'border-2 border-red-600 z-10' : 'border border-orange-600'}`} style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }} />)
                         })}
                         {currentRect && (<div className="absolute bg-orange-500/30 border-2 border-orange-500" style={{ left: `${currentRect.x}%`, top: `${currentRect.y}%`, width: `${currentRect.width}%`, height: `${currentRect.height}%` }} />)}
                      </div>
                    )}
                    <p className="text-center text-xs text-gray-400 mt-2">{selectedMaskId ? "Click 'Delete Mask' to remove selected" : "Click and drag to hide answers. Click a mask to select it."}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-gray-900 leading-tight">{getDisplayContent(selectedNote).title}</h3>
                  {getDisplayContent(selectedNote).body && (<div className="text-lg text-gray-800 whitespace-pre-wrap leading-relaxed font-normal">{getDisplayContent(selectedNote).body}</div>)}
                  {selectedNote.image_url && (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-100 select-none">
                      <img src={selectedNote.image_url} alt="Note attachment" className="w-full h-auto" />
                      {selectedNote.masks?.map(mask => {
                        const isRevealed = revealedMaskIds.includes(mask.id)
                        return (<div key={mask.id} onClick={(e) => { e.stopPropagation(); toggleMask(mask.id); }} className={`absolute transition-all cursor-pointer ${isRevealed ? 'bg-transparent border border-orange-500/30' : 'bg-orange-500 hover:bg-orange-400 border-2 border-orange-500'}`} style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }} />)
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isEditing && selectedNote.review_stage < 7 && new Date(selectedNote.next_review) <= now && (
              <div className="p-4 grid grid-cols-2 gap-4 bg-gray-50 border-t border-gray-100 shrink-0 z-10">
                <button onClick={handleForgot} className="py-4 rounded-2xl border-2 border-gray-300 text-sm font-bold text-gray-400 hover:text-gray-600 hover:border-gray-400 uppercase tracking-widest transition-colors">Forgot</button>
                <button onClick={() => handleRemember(selectedNote)} className="py-4 bg-black text-white text-sm font-bold rounded-2xl uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Remember</button>
              </div>
            )}
            
            {!isEditing && selectedNote.review_stage >= 7 && (
               <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0 z-10 text-center">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2"><Award size={16}/> Memory Mastered</p>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}