import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDate, getDaysInMonth, isFuture, isThisMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, Check, User, X, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Mask = { id: number; x: number; y: number; width: number; height: number }
type Note = {
  id: number; 
  created_at: string; 
  title?: string | null; 
  body?: string | null;
  image_url?: string | null; 
  masks?: Mask[] | null;
  activity_time?: string; 
}

export default function Record() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [isGuest, setIsGuest] = useState(false)
  const navigate = useNavigate()
  
  const [allNotesMap, setAllNotesMap] = useState<Map<string, Note[]>>(new Map())
  const [previewNote, setPreviewNote] = useState<Note | null>(null)
  const [revealedMaskIds, setRevealedMaskIds] = useState<number[]>([])
  
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const today = new Date()

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

  // ⭐️ 修复时区：使用 new Date() 强制转换为本地时间
  const safeFormatTime = (dateStr: string | undefined | null): string => { 
    if (!dateStr) return ''; 
    const date = new Date(dateStr); // Browser handles UTC -> Local conversion
    return isNaN(date.getTime()) ? '' : format(date, 'HH:mm');
  }
  
  const safeGetDateKey = (dateStr: string | undefined | null): string | null => { 
    if (!dateStr) return null; 
    const date = new Date(dateStr); 
    if (isNaN(date.getTime())) return null; 
    return format(date, 'yyyy-MM-dd'); // Output: "2026-01-23" (Local Time)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: createdData } = await supabase.from('notes').select('*')
      const { data: logData } = await supabase.from('study_logs').select('created_at, note_id')

      const noteDetailsMap = new Map<string, Note>();
      createdData?.forEach(n => { noteDetailsMap.set(String(n.id), n); });

      const dates = new Set<string>()
      const map = new Map<string, Note[]>()

      const addNoteToMap = (dateKey: string, noteId: number | string, activityTime: string) => { 
          const idStr = String(noteId);
          const noteDetail = noteDetailsMap.get(idStr);
          if (!noteDetail) return; 

          const list = map.get(dateKey) || []; 
          const existingIndex = list.findIndex(n => String(n.id) === idStr);
          
          if (existingIndex === -1) {
              list.push({ ...noteDetail, activity_time: activityTime } as Note); 
          } else {
              const existing = list[existingIndex];
              if (activityTime > (existing.activity_time || '')) {
                   list[existingIndex] = { ...noteDetail, activity_time: activityTime };
              }
          }
          map.set(dateKey, list) 
      }

      createdData?.forEach(n => { 
          const dateKey = safeGetDateKey(n.created_at); 
          if (dateKey) { dates.add(dateKey); addNoteToMap(dateKey, n.id, n.created_at) } 
      })

      logData?.forEach((log: any) => { 
          const logDateKey = safeGetDateKey(log.created_at); 
          if (logDateKey && log.note_id) { dates.add(logDateKey); addNoteToMap(logDateKey, log.note_id, log.created_at) } 
      })

      map.forEach((notes) => {
          notes.sort((a, b) => {
              const tA = a.activity_time || '';
              const tB = b.activity_time || '';
              return tB.localeCompare(tA);
          });
      });

      setActiveDates(dates); 
      setAllNotesMap(map)
    } catch (error) { console.error("Data fetch error:", error) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user?.is_anonymous) setIsGuest(true) })
    fetchData()
  }, [fetchData])

  const monthStart = startOfMonth(currentDate); 
  const monthEnd = endOfMonth(currentDate); 
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd }); 
  const daysWithNotes = daysInMonth.filter(day => activeDates.has(format(day, 'yyyy-MM-dd'))).length
  
  let totalDaysForProgress = 0; 
  if (isFuture(monthStart) && !isSameMonth(monthStart, today)) { totalDaysForProgress = 0 } 
  else if (isThisMonth(monthStart)) { totalDaysForProgress = getDate(today) } 
  else { totalDaysForProgress = getDaysInMonth(monthStart) }
  
  const currentSelectedNotes = selectedDate ? (allNotesMap.get(format(selectedDate, 'yyyy-MM-dd')) || []) : []
  const toggleMask = (id: number) => { if (revealedMaskIds.includes(id)) { setRevealedMaskIds(revealedMaskIds.filter(mid => mid !== id)) } else { setRevealedMaskIds([...revealedMaskIds, id]) } }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-900" /></div>

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

      <div className="max-w-3xl mx-auto p-6 pt-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Record</h1>
            <button onClick={fetchData} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><RefreshCw size={16} className="text-gray-500" /></button>
        </div>
        
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 min-h-[500px] flex flex-col relative">
          <div className="flex justify-between items-center mb-8 px-1">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={24} className="text-gray-400" /></button>
            <div className="flex items-center gap-4"><h2 className="text-xl font-bold text-gray-900 tracking-tight">{format(currentDate, 'MMMM yyyy')}</h2><button onClick={() => setCurrentDate(today)} className="bg-black hover:bg-gray-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider shadow-md">Today</button></div>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={24} className="text-gray-400" /></button>
          </div>
          
          <div className="grid grid-cols-7 mb-2 text-center">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (<div key={day} className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{day}</div>))}</div>
          <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center flex-1 content-start">{Array.from({ length: monthStart.getDay() }).map((_, i) => (<div key={`empty-${i}`}></div>))}{daysInMonth.map((day) => { const isToday = isSameDay(day, today); const isSelected = selectedDate && isSameDay(day, selectedDate); const hasActivity = activeDates.has(format(day, 'yyyy-MM-dd')); return (<div key={day.toString()} className="flex items-center justify-center py-1 relative group"><button onClick={() => setSelectedDate(day)} className={`w-14 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all relative ${isSelected ? 'bg-black text-white shadow-lg' : 'text-gray-700 hover:bg-gray-50'} ${isToday && !isSelected ? 'border border-gray-200 font-bold' : ''}`}>{format(day, 'd')}{hasActivity && !isSelected && (<div className="absolute -bottom-1 -right-1 bg-white border border-gray-100 rounded-full w-4 h-4 flex items-center justify-center shadow-sm z-10"><Check size={10} className="text-green-500 stroke-[3]" /></div>)}{hasActivity && isSelected && (<div className="absolute -bottom-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm z-10"><Check size={10} className="text-black stroke-[3]" /></div>)}</button></div>) })}</div>
          
          <div className="mt-8 flex justify-end items-center border-t border-gray-50 pt-6"><span className="text-gray-400 font-bold mr-3 text-sm uppercase tracking-widest">Active Days</span><div className="flex items-baseline gap-1"><span className="text-2xl font-black text-black">{daysWithNotes}</span><span className="text-sm font-bold text-gray-300">/ {totalDaysForProgress} days</span></div></div>
          
          {selectedDate && currentSelectedNotes.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-top-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{format(selectedDate, 'MMM do')} • Activity ({currentSelectedNotes.length})</h3>
              <div className="space-y-2">
                {currentSelectedNotes.map((note) => {
                  if (!note || !note.id) return null
                  return (
                  <div key={note.id} onClick={() => setPreviewNote(note)} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm cursor-pointer hover:border-gray-300 transition-colors flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-black shrink-0"></div>
                    <span className="text-sm text-gray-700 font-medium truncate">{note.title || (note.activity_time ? `${safeFormatTime(note.activity_time)} Note` : 'Untitled Note')}</span>
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {previewNote && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg shadow-2xl rounded-3xl flex flex-col max-h-[80vh] overflow-hidden relative">
                <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100 bg-gray-50/50 shrink-0 z-10">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Read Only Mode</span>
                    <button onClick={() => { setPreviewNote(null); setRevealedMaskIds([]); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">{previewNote.title || 'Untitled'}</h3>
                    <div className="text-lg text-gray-800 whitespace-pre-wrap leading-relaxed font-normal">{previewNote.body || ''}</div>
                    {previewNote.image_url && (
                        <div className="relative rounded-2xl overflow-hidden border border-gray-100 select-none">
                            <img src={previewNote.image_url} alt="Note" className="w-full h-auto" />
                            {previewNote.masks?.map(mask => { 
                                const isRevealed = revealedMaskIds.includes(mask.id); 
                                return (
                                    <div key={mask.id} onClick={(e) => { e.stopPropagation(); toggleMask(mask.id); }} className={`absolute transition-all cursor-pointer ${isRevealed ? 'bg-transparent border border-orange-500/30' : 'bg-orange-500 hover:bg-orange-400 border-2 border-orange-500'}`} style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }} />
                                ) 
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}