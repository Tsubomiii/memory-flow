import { useEffect, useState, useRef, MouseEvent, TouchEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow, format, addDays, startOfDay, differenceInCalendarDays } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Loader2, Trash2, Edit2, X, Save, Clock, ImagePlus, Undo2, Award, User, LogIn, Crown } from 'lucide-react'

type Mask = {
  id: number
  x: number
  y: number
  width: number
  height: number
}

type Note = {
  id: number; 
  title?: string | null;      
  body?: string | null;       
  content?: string | null;    
  image_url?: string | null;  
  masks?: Mask[] | null;      
  next_review: string; 
  review_stage: number; 
  created_at: string;
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const navigate = useNavigate()

  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editMasks, setEditMasks] = useState<Mask[]>([])
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedMaskId, setSelectedMaskId] = useState<number | null>(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState<Mask | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [revealedMaskIds, setRevealedMaskIds] = useState<number[]>([])
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const fetchNotes = async () => {
    setLoading(true)
    const { data } = await supabase.from('notes').select('*').order('next_review', { ascending: true })
    if (data) setNotes(data)
    setLoading(false)
  }

  useEffect(() => { 
    fetchNotes() 
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.is_anonymous) setIsGuest(true)
    })
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.updateUser({ email: email, password: password })
      if (error) throw error
      alert('Registration successful! Your data is saved.')
      setIsGuest(false) 
      setShowAuthModal(false)
    } catch (error: any) { alert(error.message) } finally { setAuthLoading(false) }
  }

  const intervals = [1, 2, 4, 7, 15, 30]
  const now = new Date()

  const isExpired = (note: Note) => {
    if (new Date(note.next_review) > now) return false; 
    const stage = note.review_stage;
    if (stage === 0) return false; 
    const currentInterval = intervals[stage - 1] || 1; 
    const daysOverdue = differenceInCalendarDays(now, new Date(note.next_review));
    return daysOverdue > (currentInterval * 2);
  }

  const getBadgeStyle = (note: Note) => {
    if (isExpired(note)) return "bg-red-500 text-white"; 
    const s = note.review_stage;
    if (s === 0) return "bg-gray-100 text-gray-400"; 
    if (s === 1) return "bg-slate-400 text-white"; 
    if (s === 2) return "bg-slate-500 text-white"; 
    if (s === 3) return "bg-blue-400 text-white"; 
    if (s === 4) return "bg-blue-500 text-white"; 
    if (s === 5) return "bg-blue-600 text-white"; 
    return "bg-indigo-800 text-white"; 
  }

  const getBadgeContent = (note: Note) => {
    if (isExpired(note)) return "Re-learn";
    if (note.review_stage === 0) return "New";
    return `${note.review_stage}`;
  }

  const getReviewCountText = (note: Note) => {
    if (note.review_stage === 0) return "New Memory";
    return `Reviewed ${note.review_stage} times`;
  }

  const getModalHeaderText = (note: Note) => {
    if (isExpired(note)) return "Memory expired";

    const isFuture = new Date(note.next_review) > now;
    
    if (isFuture) {
        const daysUntil = differenceInCalendarDays(new Date(note.next_review), now);
        const dayText = daysUntil <= 1 ? '1 day' : `${daysUntil} days`;
        return `Next review in ${dayText}`;
    } else {
        const currentStage = note.review_stage;
        const nextInterval = intervals[currentStage];
        if (!nextInterval) return "Review due";
        const dayText = nextInterval <= 1 ? '1 day' : `${nextInterval} days`;
        return `Next review in ${dayText}`;
    }
  }
  
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
    if (body && body.trim().length > 0) return body.split('\n')[0];
    if (note.image_url) return "[Image]";
    return "Tap to review...";
  }

  const handleRemember = async (note: Note) => {
    const expired = isExpired(note);
    let nextStage;
    if (expired) { nextStage = 1; } else { nextStage = note.review_stage + 1; }
    let nextReview = new Date()
    if (nextStage >= intervals.length) { 
        nextStage = 7 
        nextReview = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000) 
    } else {
        const daysToAdd = intervals[nextStage - 1];
        nextReview = startOfDay(addDays(now, daysToAdd))
    }
    await supabase.from('notes').update({ review_stage: nextStage, next_review: nextReview.toISOString() }).eq('id', note.id)
    await supabase.from('study_logs').insert({ note_id: note.id })
    closeModal()
    fetchNotes()
  }

  const handleForgot = async (note: Note) => {
    const isFuture = new Date(note.next_review) > now
    if (isFuture) {
        const newStage = Math.max(0, note.review_stage - 1)
        await supabase.from('notes').update({ next_review: new Date().toISOString(), review_stage: newStage }).eq('id', note.id)
        fetchNotes()
    }
    closeModal()
  }

  const closeModal = () => { setSelectedNote(null); setRevealedMaskIds([]); setEditImagePreview(null); setEditImageFile(null); setEditMasks([]); setSelectedMaskId(null); }

  const getPointFromEvent = (e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    let clientX, clientY
    if ('touches' in e) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY } else { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY }
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x, y }
  }
  const handleDrawStart = (e: MouseEvent | TouchEvent) => { if (!isEditing) return; if(e.type === 'touchstart') { } setSelectedMaskId(null); setIsDrawing(true); const pos = getPointFromEvent(e); setStartPos(pos); setCurrentRect({ id: Date.now(), x: pos.x, y: pos.y, width: 0, height: 0 }) }
  const handleDrawMove = (e: MouseEvent | TouchEvent) => { if (!isDrawing || !currentRect) return; e.preventDefault(); const pos = getPointFromEvent(e); const x = Math.min(pos.x, startPos.x); const y = Math.min(pos.y, startPos.y); const width = Math.abs(pos.x - startPos.x); const height = Math.abs(pos.y - startPos.y); setCurrentRect({ ...currentRect, x, y, width, height }) }
  const handleDrawEnd = () => { if (isDrawing && currentRect && currentRect.width > 1 && currentRect.height > 1) { setEditMasks([...editMasks, currentRect]) } setIsDrawing(false); setCurrentRect(null) }
  const handleDeleteSelectedMask = () => { if (selectedMaskId) { setEditMasks(editMasks.filter(m => m.id !== selectedMaskId)); setSelectedMaskId(null) } }
  const handleSaveEdit = async () => { if (!selectedNote) return; setIsSavingEdit(true); try { let imageUrl = selectedNote.image_url; if (editImageFile) { const { data: { user } } = await supabase.auth.getUser(); if (user) { const fileExt = editImageFile.name.split('.').pop(); const fileName = `${user.id}/${Date.now()}_edit.${fileExt}`; await supabase.storage.from('note-images').upload(fileName, editImageFile); const { data } = supabase.storage.from('note-images').getPublicUrl(fileName); imageUrl = data.publicUrl } } const updates = { title: editTitle.trim() || null, body: editBody.trim(), image_url: imageUrl, masks: editMasks }; await supabase.from('notes').update(updates).eq('id', selectedNote.id); setNotes(notes.map(n => n.id === selectedNote.id ? { ...n, ...updates } : n)); setSelectedNote({ ...selectedNote, ...updates }); setIsEditing(false); setEditImageFile(null); setEditImagePreview(null); setSelectedMaskId(null) } catch (error) { alert("Failed to save edit") } finally { setIsSavingEdit(false) } }
  const handleDelete = async (id: number) => { if (!confirm('Delete this note?')) return; await supabase.from('notes').delete().eq('id', id); closeModal(); fetchNotes() }
  const openNote = (note: Note) => { const { title, body } = getDisplayContent(note); setSelectedNote(note); setEditTitle(note.title || ''); setEditBody(body); setEditMasks(note.masks || []); setIsEditing(false); setRevealedMaskIds([]); setSelectedMaskId(null) }
  const toggleMask = (id: number) => { if (revealedMaskIds.includes(id)) { setRevealedMaskIds(revealedMaskIds.filter(mid => mid !== id)) } else { setRevealedMaskIds([...revealedMaskIds, id]) } }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-gray-900" /></div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {isGuest && (
        <div className="sticky top-0 z-40 bg-orange-50 border-b border-orange-100 px-6 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2"><User size={16} className="text-orange-400" /><span className="text-xs font-bold text-orange-600 tracking-wide">Guest Mode: Data lost on exit</span></div>
          <button onClick={() => setShowAuthModal(true)} className="bg-black hover:bg-gray-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider">Save Data</button>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-gray-900">Save Your Progress</h2><p className="text-sm text-gray-400 mt-1">Create an account to sync your memories.</p>
            </div>
            <form onSubmit={handleSignUp} className="space-y-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-colors" />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-colors" />
              <button type="submit" disabled={authLoading} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors flex justify-center items-center gap-2">{authLoading ? <Loader2 className="animate-spin" size={18}/> : 'Create Account'}</button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-6 space-y-8 pt-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">Memory Flow</h1>
        
        {/* NOW Section */}
        <section>
          {/* ⭐️ 修改点 1：Review Due 文字和图标颜色改为 #007fc6 */}
          <div className="flex items-center gap-2 mb-3">
            <Clock size={20} className="text-[#007fc6]" />
            <h2 className="text-xl font-bold text-[#007fc6] tracking-tight">Review Due ({dueNotes.length})</h2>
          </div>
          <div className="space-y-3">
            {dueNotes.length === 0 ? (<div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-400 font-medium">All caught up!</p></div>) : (dueNotes.map(note => { const { title } = getDisplayContent(note); const previewText = getPreviewText(note); 
            const isNew = note.review_stage === 0;
            const badgeSize = isNew ? "h-6 min-w-[1.5rem] px-1.5" : "h-8 w-8"; 
            const textSize = isNew ? "text-xs" : "text-sm"; 
            
            return (<div key={note.id} onClick={() => openNote(note)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all cursor-pointer group"><div className="flex-1 min-w-0 mr-4"><h3 className="text-gray-900 font-bold text-base mb-1 truncate">{title}</h3><p className="text-gray-400 text-xs truncate font-medium opacity-60">{previewText}</p></div><div className={`shrink-0 ${badgeSize} flex items-center justify-center rounded-full transition-colors ${getBadgeStyle(note)}`}><span className={`${textSize} font-bold`}>{getBadgeContent(note)}</span></div></div>) }))}
          </div>
        </section>

        {/* FUTURE Section */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 mb-3 tracking-widest uppercase pl-1">Tomorrow & Beyond</h2>
          <div className="space-y-3">
            {futureNotes.map(note => { 
               const { title } = getDisplayContent(note)
               const previewText = getPreviewText(note)
               const daysUntil = differenceInCalendarDays(new Date(note.next_review), now)
               const dayText = daysUntil <= 1 ? '1 day' : `${daysUntil} days`
               return (
              <div key={note.id} onClick={() => openNote(note)} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-gray-200 transition-all cursor-pointer">
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-gray-800 font-semibold text-base truncate">{title}</h3>
                  <p className="text-gray-400 text-xs truncate font-medium opacity-60">{previewText}</p>
                </div>
                <div className="shrink-0 bg-orange-50 px-3 py-1 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-400">{dayText}</span>
                </div>
              </div>
            )})}
          </div>
        </section>

        {masteredNotes.length > 0 && (<section className="pt-6 border-t border-gray-100"><div className="flex items-center gap-2 mb-3 opacity-50"><Crown size={16} className="text-yellow-500" /><h2 className="text-sm font-bold text-gray-400 tracking-widest uppercase">Mastered ({masteredNotes.length})</h2></div><div className="space-y-2 opacity-40 hover:opacity-100 transition-opacity duration-300">{masteredNotes.map(note => { const { title } = getDisplayContent(note); return (<div key={note.id} onClick={() => openNote(note)} className="bg-gray-50 px-4 py-2 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-100"><h3 className="text-gray-500 font-medium text-xs truncate">{title}</h3><span className="text-[10px] font-bold text-yellow-500 uppercase">Done</span></div>) })}</div></section>)}

        {/* Note Modal */}
        {selectedNote && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg shadow-2xl rounded-3xl flex flex-col max-h-[80vh] overflow-hidden relative">
              <div className="px-4 py-2 flex justify-between items-center border-b border-gray-100 bg-gray-50/50 shrink-0 z-10">
                {!isEditing ? (
                  // ⭐️ 修改点 2：弹窗顶部 Next review 文字颜色改为 text-orange-400
                  <span className={`text-xs font-bold uppercase tracking-widest ${isExpired(selectedNote) ? 'text-red-500' : 'text-orange-400'}`}>
                    {getModalHeaderText(selectedNote)}
                  </span>
                ) : (
                  <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                )}
                
                <div className="flex gap-2">
                  {isEditing ? (
                    // ⭐️ 修改点 3：Save 按钮去掉图标，只保留 SAVE 文字
                    <button onClick={handleSaveEdit} disabled={isSavingEdit} className="text-xs font-bold bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-800 disabled:opacity-50">
                      {isSavingEdit ? <Loader2 className="animate-spin" size={14}/> : 'SAVE'}
                    </button>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><Edit2 size={18} className="text-gray-500" /></button>
                  )}
                  <button onClick={() => handleDelete(selectedNote.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} className="text-gray-300 hover:text-red-500" /></button>
                  {!isEditing && <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><X size={20} className="text-gray-500" /></button>}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
                {isEditing ? (
                  <div className="space-y-4">
                    <div><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={50} placeholder="Title (Optional, Defaults to time if empty)" className="w-full text-xl font-bold outline-none border-b border-gray-500 pb-2" /></div>
                    <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Text" className="w-full h-40 p-0 outline-none resize-none text-lg text-gray-800 leading-relaxed font-normal" />
                    <div>
                      <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if(file) { setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)); setEditMasks([]); setSelectedMaskId(null); } }} accept="image/*" className="hidden" />
                      <div className="flex justify-between items-center mb-2">
                        {/* ⭐️ 修改点 4：Change/Add Image 按钮颜色改为 #007fc6 */}
                        <button onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-[#007fc6] hover:underline flex gap-1 items-center">
                          <ImagePlus size={16}/> {selectedNote.image_url ? 'Change Image' : 'Add Image'}
                        </button>
                        <div className="flex gap-2">{selectedMaskId ? (<button onClick={handleDeleteSelectedMask} className="text-xs font-bold text-red-500 hover:text-red-700 flex gap-1 items-center bg-red-50 px-2 py-1 rounded transition-colors"><Trash2 size={12}/> Delete Mask</button>) : (<button onClick={() => setEditMasks(editMasks.slice(0, -1))} className="text-xs font-bold text-gray-500 hover:text-black flex gap-1 items-center bg-gray-100 px-2 py-1 rounded transition-colors"><Undo2 size={12}/> Undo Last</button>)}</div>
                      </div>
                      {(editImagePreview || selectedNote.image_url) && (<div ref={containerRef} className="relative rounded-xl overflow-hidden border border-gray-200 cursor-crosshair touch-none select-none" onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd} onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd}><img src={editImagePreview || selectedNote.image_url || ''} alt="Preview" className="w-full h-auto object-contain pointer-events-none" />{editMasks.map(mask => { const isSelected = mask.id === selectedMaskId; return (<div key={mask.id} onMouseDown={(e) => { e.stopPropagation(); setSelectedMaskId(mask.id); }} onTouchStart={(e) => { e.stopPropagation(); setSelectedMaskId(mask.id); }} className={`absolute bg-orange-500/50 cursor-pointer transition-all ${isSelected ? 'border-2 border-red-600 z-10' : 'border border-orange-600'}`} style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }} />) })}{currentRect && (<div className="absolute bg-orange-500/30 border-2 border-orange-500" style={{ left: `${currentRect.x}%`, top: `${currentRect.y}%`, width: `${currentRect.width}%`, height: `${currentRect.height}%` }} />)}</div>)}
                      <p className="text-center text-xs text-gray-400 mt-2">{selectedMaskId ? "Click 'Delete Mask' to remove selected" : "Click and drag to hide answers. Click a mask to select it."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">{getDisplayContent(selectedNote).title}</h3>
                    {getDisplayContent(selectedNote).body && (<div className="text-lg text-gray-800 whitespace-pre-wrap leading-relaxed font-normal">{getDisplayContent(selectedNote).body}</div>)}
                    {selectedNote.image_url && (<div className="relative rounded-2xl overflow-hidden border border-gray-100 select-none"><img src={selectedNote.image_url} alt="Note attachment" className="w-full h-auto" />{selectedNote.masks?.map(mask => { const isRevealed = revealedMaskIds.includes(mask.id); return (<div key={mask.id} onClick={(e) => { e.stopPropagation(); toggleMask(mask.id); }} className={`absolute transition-all cursor-pointer ${isRevealed ? 'bg-transparent border border-orange-500/30' : 'bg-orange-500 hover:bg-orange-400 border-2 border-orange-500'}`} style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }} />) })}</div>)}
                    
                    <div className="pt-4 text-center">
                        <p className="text-xs font-medium text-gray-300 uppercase tracking-widest">{getReviewCountText(selectedNote)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {!isEditing && selectedNote.review_stage < 7 && new Date(selectedNote.next_review) <= now && (
                <div className="p-4 grid grid-cols-2 gap-4 bg-gray-50 border-t border-gray-100 shrink-0 z-10">
                  <button onClick={() => handleForgot(selectedNote)} className="py-4 rounded-2xl border-2 border-gray-300 text-sm font-bold text-gray-400 hover:text-gray-600 hover:border-gray-400 uppercase tracking-widest transition-colors">Forgot</button>
                  <button onClick={() => handleRemember(selectedNote)} className="py-4 bg-black text-white text-sm font-bold rounded-2xl uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Remember</button>
                </div>
              )}
              {!isEditing && selectedNote.review_stage < 7 && new Date(selectedNote.next_review) > now && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0 z-10">
                  <button onClick={() => handleForgot(selectedNote)} className="w-full py-4 rounded-2xl border-2 border-gray-300 text-sm font-bold text-gray-400 hover:text-gray-600 hover:border-gray-400 uppercase tracking-widest transition-colors">Forgot</button>
                </div>
              )}
              {!isEditing && selectedNote.review_stage >= 7 && (<div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0 z-10 text-center"><p className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center justify-center gap-2"><Crown size={16}/> Memory Mastered</p></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}