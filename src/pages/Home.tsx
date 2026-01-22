import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Clock, Calendar, CheckCircle2, Loader2, LogOut, X, CheckCircle, RefreshCcw, AlertTriangle, Mail, Lock, Trophy, Type, AlignLeft, Image as ImageIcon, Send, Eraser } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

// Types
interface Mask { id: string; x: number; y: number; w: number; h: number }
interface Note { 
  id: number; 
  title: string; 
  content: string; 
  image_url?: string | null; 
  masks?: Mask[] | null; 
  created_at: string; 
  review_stage: number; 
  next_review_at: string; 
  user_id: string 
}
const REVIEW_INTERVALS = [1, 3, 7, 14, 30]

const InteractiveImage = ({ src, masks }: { src: string, masks?: Mask[] | null }) => {
  const [revealedIds, setRevealedIds] = useState<string[]>([])
  const toggleReveal = (id: string) => { setRevealedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) }
  return (
    <div className="relative mt-3 inline-block w-full group select-none">
      <img src={src} className="w-full h-auto rounded-lg border border-gray-100 pointer-events-none" alt="note" />
      {masks && masks.map(mask => (
        <div key={mask.id} onClick={(e) => { e.stopPropagation(); toggleReveal(mask.id); }}
          className={`absolute border-2 cursor-pointer transition-all duration-200 active:scale-95 shadow-sm ${revealedIds.includes(mask.id) ? 'bg-transparent border-orange-400/30' : 'bg-orange-500 border-orange-500'}`}
          style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.w}%`, height: `${mask.h}%` }}
        />
      ))}
    </div>
  )
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  
  // Quick Input (Empty State)
  const [newTitle, setNewTitle] = useState(''); const [newContent, setNewContent] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState<string | null>(null); const [masks, setMasks] = useState<Mask[]>([]); const [isDrawing, setIsDrawing] = useState(false); const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false); const [isAnonymous, setIsAnonymous] = useState(false) 

  // Review & Edit State
  const [reviewingNote, setReviewingNote] = useState<Note | null>(null)
  const [editingContent, setEditingContent] = useState('')

  // Upgrade State
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerEmail, setRegisterEmail] = useState(''); const [registerPassword, setRegisterPassword] = useState(''); const [isRegistering, setIsRegistering] = useState(false); const [registerSuccess, setRegisterSuccess] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null); const imgRef = useRef<HTMLImageElement>(null); const navigate = useNavigate()

  useEffect(() => { checkUser(); fetchNotes() }, [])
  const checkUser = async () => { const { data: { user } } = await supabase.auth.getUser(); if (user?.is_anonymous) setIsAnonymous(true) }
  const fetchNotes = async () => { 
    const { data, error } = await supabase.from('notes').select('*').order('next_review_at', { ascending: true }); 
    if (!error) setNotes(data || []); 
    setLoading(false) 
  }

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr).getTime()
    const now = new Date().getTime()
    return Math.ceil((target - now) / (1000 * 3600 * 24))
  }

  // ✨ Helper: 生成默认时间标题
  const getDefaultTitle = () => {
    const now = new Date()
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  // ✨ Quick Save (Empty State Logic Updated)
  const handleAddFirstNote = async () => { 
    if (!newContent.trim() && !selectedImage && !newTitle.trim()) return; 
    setIsSubmitting(true); 
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return; 
    let url = null; 
    if (selectedImage) { const name = `${Math.random()}.${selectedImage.name.split('.').pop()}`; await supabase.storage.from('photos').upload(`${user.id}/${name}`, selectedImage); url = supabase.storage.from('photos').getPublicUrl(`${user.id}/${name}`).data.publicUrl } 
    
    // ✨ 如果没有标题，自动生成
    const finalTitle = newTitle.trim() || getDefaultTitle()

    await supabase.from('notes').insert([{ title: finalTitle, content: newContent, text_color: 'text-gray-900', image_url: url, masks, review_stage: 0, next_review_at: new Date().toISOString(), user_id: user.id }]); 
    const {data} = await supabase.from('notes').select().order('created_at', {ascending: false}).limit(1); 
    if(data) { setNotes([data[0], ...notes]); setNewContent(''); setNewTitle(''); setSelectedImage(null); setImagePreview(null); setMasks([]); }; 
    setIsSubmitting(false) 
  }

  // Drawing Logic (Empty State)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { if(e.target.files[0].size > 5*1024*1024) return; setSelectedImage(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); setMasks([]) } }
  const handleMouseDown = (e: React.MouseEvent) => { if (!imgRef.current) return; const rect = imgRef.current.getBoundingClientRect(); setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); setIsDrawing(true) }
  const handleMouseUp = (e: React.MouseEvent) => { if (!isDrawing) return; const rect = imgRef.current!.getBoundingClientRect(); const w = Math.abs((e.clientX-rect.left)-startPos.x); const h = Math.abs((e.clientY-rect.top)-startPos.y); if(w>5 && h>5) setMasks([...masks, { id: Date.now().toString(), x: (Math.min(e.clientX-rect.left, startPos.x)/rect.width)*100, y: (Math.min(e.clientY-rect.top, startPos.y)/rect.height)*100, w: (w/rect.width)*100, h: (h/rect.height)*100 }]); setIsDrawing(false) }
  const handleTouchStart = (e: React.TouchEvent) => { if (!imgRef.current) return; const touch = e.touches[0]; const rect = imgRef.current.getBoundingClientRect(); setStartPos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top }); setIsDrawing(true) }
  const handleTouchEnd = (e: React.TouchEvent) => { if (!isDrawing) return; const touch = e.changedTouches[0]; const rect = imgRef.current!.getBoundingClientRect(); const w = Math.abs((touch.clientX-rect.left)-startPos.x); const h = Math.abs((touch.clientY-rect.top)-startPos.y); if(w>5 && h>5) setMasks([...masks, { id: Date.now().toString(), x: (Math.min(touch.clientX-rect.left, startPos.x)/rect.width)*100, y: (Math.min(touch.clientY-rect.top, startPos.y)/rect.height)*100, w: (w/rect.width)*100, h: (h/rect.height)*100 }]); setIsDrawing(false) }
  const undoMask = () => setMasks(prev => prev.slice(0, -1))

  // Review & Reset Logic
  const handleReview = async () => { 
    if (!reviewingNote) return
    let nextStage = reviewingNote.review_stage; let nextDateISO = reviewingNote.next_review_at
    if (reviewingNote.review_stage < REVIEW_INTERVALS.length) { const days = REVIEW_INTERVALS[reviewingNote.review_stage]; nextStage = reviewingNote.review_stage + 1; const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + days); nextDateISO = nextDate.toISOString() } 
    else { if(reviewingNote.review_stage < 99) nextStage = 99 }
    
    const originalNotes = [...notes]
    setNotes(notes.map(n => n.id === reviewingNote.id ? { ...n, content: editingContent, review_stage: nextStage, next_review_at: nextDateISO } : n)); 
    setReviewingNote(null) 
    const { error } = await supabase.from('notes').update({ content: editingContent, review_stage: nextStage, next_review_at: nextDateISO }).eq('id', reviewingNote.id)
    if (error) { alert("Sync failed: " + error.message); setNotes(originalNotes) }
  }

  const handleReset = async () => {
    if (!reviewingNote) return
    const nowISO = new Date().toISOString(); const originalNotes = [...notes]
    setNotes(notes.map(n => n.id === reviewingNote.id ? { ...n, content: editingContent, review_stage: 0, next_review_at: nowISO } : n));
    setReviewingNote(null)
    const { error } = await supabase.from('notes').update({ content: editingContent, review_stage: 0, next_review_at: nowISO }).eq('id', reviewingNote.id)
    if (error) { alert("Reset failed: " + error.message); setNotes(originalNotes) }
  }

  const handleDelete = async (id: number) => { if (!confirm('Delete this memory?')) return; setNotes(prev => prev.filter(n => n.id !== id)); const { error } = await supabase.from('notes').delete().eq('id', id); if (error) alert("Delete failed: " + error.message) }
  const handleLogout = async () => { if (isAnonymous && !confirm('Guest data will be lost. Are you sure?')) return; await supabase.auth.signOut(); navigate('/login'); window.location.reload() }
  const handleUpgradeAccount = async (e: React.FormEvent) => { e.preventDefault(); setIsRegistering(true); const { error } = await supabase.auth.updateUser({ email: registerEmail, password: registerPassword }); if (error) { alert(`Error: ${error.message}`) } else { setRegisterSuccess(true) }; setIsRegistering(false) }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>

  const masteredNotes = notes.filter(n => n.review_stage >= 99)
  const activeNotes = notes.filter(n => n.review_stage < 99)
  const dueNotes = activeNotes.filter(n => getDaysUntil(n.next_review_at) <= 0)
  const tomorrowNotes = activeNotes.filter(n => getDaysUntil(n.next_review_at) === 1)
  const dayAfterNotes = activeNotes.filter(n => getDaysUntil(n.next_review_at) === 2)
  const laterNotes = activeNotes.filter(n => getDaysUntil(n.next_review_at) >= 3)
  const isEmptyState = notes.length === 0
  const isReviewingFuture = reviewingNote ? getDaysUntil(reviewingNote.next_review_at) > 0 : false
  const isReviewingMastered = reviewingNote ? reviewingNote.review_stage >= 99 : false

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-gray-50 relative pb-32">
      {isAnonymous && (<div className="bg-orange-50 border-b border-orange-100 p-3 px-6 flex items-center gap-3 animate-in slide-in-from-top duration-300"><AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" /><div className="flex-1"><p className="text-sm text-orange-800 font-bold">Guest Mode Active</p><p className="text-xs text-orange-600">Bind email to save data permanently.</p></div><button onClick={() => setShowRegisterModal(true)} className="text-xs bg-gray-900 text-white border border-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-800 shadow-sm active:scale-95">Save Data</button></div>)}
      {showRegisterModal && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden"><button onClick={() => setShowRegisterModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>{registerSuccess ? (<div className="text-center py-8"><div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Mail className="w-8 h-8" /></div><h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3><p className="text-gray-500 text-sm mb-6">We sent a confirmation link to <strong>{registerEmail}</strong>.</p><button onClick={() => setShowRegisterModal(false)} className="w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-200">Got it</button></div>) : (<div className="text-center"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock className="w-6 h-6" /></div><h3 className="text-xl font-black text-gray-900 mb-1">Save your Memories</h3><p className="text-gray-500 text-sm mb-6">Create an account to save data.</p><form onSubmit={handleUpgradeAccount} className="space-y-4"><div className="relative"><Mail className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" /><input type="email" required placeholder="Email" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-black font-medium text-gray-900" /></div><div className="relative"><Lock className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" /><input type="password" required placeholder="Set Password" minLength={6} value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-black font-medium text-gray-900" /></div><button type="submit" disabled={isRegistering} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2">{isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}</button></form></div>)}</div></div>)}

      {reviewingNote && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                 <h3 className="font-bold text-lg text-gray-900 truncate pr-4">{reviewingNote.title || 'Untitled Memory'}</h3>
                 <button onClick={() => setReviewingNote(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                  {reviewingNote.image_url && (<div className="mb-6"><InteractiveImage src={reviewingNote.image_url} masks={reviewingNote.masks} /></div>)}
                  <div className="min-h-[100px]">
                    <textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className="w-full resize-none outline-none bg-transparent text-lg leading-relaxed text-gray-900" style={{ minHeight: '150px' }} placeholder="No content..." />
                  </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                 <button onClick={handleReset} className="flex-1 bg-white text-gray-500 border border-gray-200 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"><RefreshCcw className="w-5 h-5" /><span>{isReviewingFuture ? 'Reset to Today' : 'Reset / Forgot'}</span></button>
                 {!isReviewingFuture && !isReviewingMastered && (<button onClick={handleReview} className="flex-[2] bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"><CheckCircle className="w-6 h-6 text-green-400" /><span>I remember</span></button>)}
                 {isReviewingMastered && (<button onClick={handleReview} className="flex-[2] bg-gray-100 text-gray-400 py-4 rounded-xl font-bold text-lg cursor-default flex items-center justify-center gap-2"><Trophy className="w-5 h-5" /><span>Mastered</span></button>)}
              </div>
           </div>
        </div>
      )}

      <div className="p-6 space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Memory Flow</h1>
          <button onClick={handleLogout}><LogOut className="w-5 h-5 text-gray-400 hover:text-red-500 transition-colors" /></button>
        </header>

        {isEmptyState ? (
          <div className="flex flex-col items-center justify-center pt-4 animate-in fade-in zoom-in duration-500">
             <div className="w-full bg-white p-6 rounded-3xl shadow-lg border border-indigo-50">
                <div className="relative mb-2">
                   <Type className="w-5 h-5 text-gray-300 absolute left-0 top-3" />
                   <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title (Optional - Auto Date)" className="w-full pl-8 py-2 text-xl font-bold text-gray-900 placeholder:text-gray-300 outline-none border-b border-transparent focus:border-gray-200 transition-colors" />
                </div>
                <div className="relative">
                   <AlignLeft className="w-5 h-5 text-gray-300 absolute left-0 top-1" />
                   <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Add details..." className="w-full pl-8 resize-none outline-none text-gray-600 placeholder:text-gray-300 min-h-[60px] mb-4 bg-transparent leading-relaxed" />
                </div>
                {imagePreview ? (
                  <div className="relative mb-4 border-2 border-dashed border-indigo-100 rounded-lg overflow-hidden select-none touch-none">
                    <div className="absolute inset-0 z-10 cursor-crosshair touch-none" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={() => setIsDrawing(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}></div>
                    <img ref={imgRef} src={imagePreview} className="w-full h-auto block" />
                    {masks.map(mask => (<div key={mask.id} className="absolute bg-orange-500/60 border border-white/50" style={{left:`${mask.x}%`, top:`${mask.y}%`, width:`${mask.w}%`, height:`${mask.h}%`}}></div>))}
                    <button onClick={() => {setImagePreview(null); setSelectedImage(null); setMasks([])}} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"><Eraser className="w-4 h-4" /></button>
                  </div>
                ) : ( <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"><ImageIcon className="w-8 h-8 mb-2" /><span className="font-bold">Add Image (Optional)</span></button> )}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                {masks.length > 0 && (<div className="flex justify-end mt-2"><button onClick={undoMask} className="flex items-center gap-2 text-red-500 font-bold bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100"><Eraser className="w-4 h-4" /> Undo Mask</button></div>)}
                <div className="flex justify-end pt-4"><button onClick={handleAddFirstNote} disabled={(!newTitle.trim() && !newContent.trim() && !selectedImage) || isSubmitting} className="bg-black text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Save</button></div>
             </div>
          </div>
        ) : (
          <>
            {dueNotes.length > 0 && (<section className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500"><div className="flex items-center gap-2 text-indigo-600 font-bold text-lg"><Clock className="w-5 h-5" /><h2>Review Due ({dueNotes.length})</h2></div><div className="grid gap-3">{dueNotes.map(note => (<NoteCard key={note.id} note={note} onClick={() => { setReviewingNote(note); setEditingContent(note.content); }} badge="Now" badgeColor="bg-indigo-50 text-indigo-600" />))}</div></section>)}
            {tomorrowNotes.length > 0 && (<section className="space-y-3 animate-in fade-in duration-500 delay-100"><div className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase tracking-wider ml-1">Tomorrow</div><div className="grid gap-3">{tomorrowNotes.map(note => (<NoteCard key={note.id} note={note} onClick={() => { setReviewingNote(note); setEditingContent(note.content); }} badge="1d" badgeColor="bg-orange-50 text-orange-600" />))}</div></section>)}
            {dayAfterNotes.length > 0 && (<section className="space-y-3 animate-in fade-in duration-500 delay-150"><div className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase tracking-wider ml-1">In 2 Days</div><div className="grid gap-3">{dayAfterNotes.map(note => (<NoteCard key={note.id} note={note} onClick={() => { setReviewingNote(note); setEditingContent(note.content); }} badge="2d" badgeColor="bg-yellow-50 text-yellow-600" />))}</div></section>)}
            {laterNotes.length > 0 && (<section className="space-y-3 animate-in fade-in duration-500 delay-200"><div className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase tracking-wider ml-1">Upcoming</div><div className="grid gap-3">{laterNotes.map(note => (<NoteCard key={note.id} note={note} onClick={() => { setReviewingNote(note); setEditingContent(note.content); }} badge={`in ${getDaysUntil(note.next_review_at)}d`} badgeColor="bg-green-50 text-green-600" />))}</div></section>)}
            {masteredNotes.length > 0 && (<section className="space-y-3 animate-in fade-in duration-500 delay-300 opacity-60 hover:opacity-100 transition-opacity"><div className="flex items-center gap-2 text-gray-400 font-bold text-sm uppercase tracking-wider ml-1"><Trophy className="w-4 h-4" /> Mastered ({masteredNotes.length})</div><div className="grid gap-3">{masteredNotes.map(note => (<NoteCard key={note.id} note={note} onClick={() => { setReviewingNote(note); setEditingContent(note.content); }} badge="Done" badgeColor="bg-gray-100 text-gray-400" />))}</div></section>)}
          </>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-2xl mx-auto px-6 pb-8 z-50 pointer-events-none flex justify-end"><Link to="/input" className="bg-black text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 pointer-events-auto"><Plus className="w-6 h-6" /></Link></div>
    </div>
  )
}

const NoteCard = ({ note, onClick, badge, badgeColor }: { note: Note, onClick: () => void, badge: string, badgeColor: string }) => (
  <div onClick={onClick} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer flex justify-between items-center group">
    <div><h3 className="text-gray-900 font-bold text-base mb-1">{note.title || 'Untitled Memory'}</h3><p className="text-gray-400 text-xs truncate max-w-[200px]">{note.content || 'Tap to review...'}</p></div>
    <div className={`px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>{badge}</div>
  </div>
)