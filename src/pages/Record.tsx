import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, 
  parseISO, getDate, getDaysInMonth, isFuture, isThisMonth 
} from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react'

type Note = {
  id: number; content: string; created_at: string; title?: string; body?: string;
}

export default function Record() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [notes, setNotes] = useState<Note[]>([])
  
  // ⭐️ 新增：存储所有的打卡日期字符串 (格式 'yyyy-MM-dd')
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  
  const today = new Date()

  useEffect(() => {
    const fetchData = async () => {
      // 1. 获取新建笔记记录
      const { data: notesData } = await supabase.from('notes').select('id, content, created_at, title, body')
      
      // 2. 获取复习打卡记录
      const { data: logsData } = await supabase.from('study_logs').select('created_at')

      if (notesData) setNotes(notesData)

      // 3. 合并所有日期
      const dates = new Set<string>()
      
      // 添加新建日期
      notesData?.forEach(n => {
          dates.add(format(parseISO(n.created_at), 'yyyy-MM-dd'))
      })
      
      // 添加复习打卡日期
      logsData?.forEach(l => {
          dates.add(format(parseISO(l.created_at), 'yyyy-MM-dd'))
      })

      setActiveDates(dates)
      setLoading(false)
    }
    fetchData()
  }, [])

  // --- 日历核心逻辑 ---
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 计算分子：本月有几天打卡了
  // 遍历本月所有天，看哪天在 activeDates 里
  const daysWithNotes = daysInMonth.filter(day => 
    activeDates.has(format(day, 'yyyy-MM-dd'))
  ).length

  // 计算分母
  let totalDaysForProgress = 0
  if (isFuture(monthStart) && !isSameMonth(monthStart, today)) {
    totalDaysForProgress = 0
  } else if (isThisMonth(monthStart)) {
    totalDaysForProgress = getDate(today)
  } else {
    totalDaysForProgress = getDaysInMonth(monthStart)
  }

  // 获取选中日期的笔记 (只显示当天新建的笔记详情，复习记录不显示详情只打勾)
  const selectedDateNotes = notes.filter(note => 
    selectedDate && isSameDay(parseISO(note.created_at), selectedDate)
  )

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-900" /></div>

  return (
    <div className="max-w-3xl mx-auto p-6 pt-12 pb-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Memory Flow</h1>
      </div>
      
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 min-h-[500px] flex flex-col relative">
        
        <div className="flex justify-between items-center mb-8 px-1">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-400" />
          </button>

          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button 
              onClick={() => setCurrentDate(today)}
              className="bg-black hover:bg-gray-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider shadow-md"
            >
              Today
            </button>
          </div>

          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2 text-center">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center flex-1 content-start">
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`}></div>
          ))}
          
          {daysInMonth.map((day) => {
            const isToday = isSameDay(day, today)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            
            // ⭐️ 判断打卡：检查日期集合里有没有这一天
            const hasActivity = activeDates.has(format(day, 'yyyy-MM-dd'))

            return (
              <div key={day.toString()} className="flex items-center justify-center py-1 relative group">
                <button
                  onClick={() => setSelectedDate(day)}
                  className={`
                    w-14 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all relative
                    ${isSelected ? 'bg-black text-white shadow-lg' : 'text-gray-700 hover:bg-gray-50'}
                    ${isToday && !isSelected ? 'border border-gray-200 font-bold' : ''}
                  `}
                >
                  {format(day, 'd')}
                  
                  {/* 打勾逻辑：如果有活动记录 (新建或复习)，显示勾勾 */}
                  {hasActivity && !isSelected && (
                    <div className="absolute -bottom-1 -right-1 bg-white border border-gray-100 rounded-full w-4 h-4 flex items-center justify-center shadow-sm z-10">
                      <Check size={10} className="text-green-500 stroke-[3]" />
                    </div>
                  )}
                  {hasActivity && isSelected && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm z-10">
                       <Check size={10} className="text-black stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex justify-end items-center border-t border-gray-50 pt-6">
          <span className="text-gray-400 font-bold mr-3 text-sm uppercase tracking-widest">Study Log</span>
          <div className="flex items-baseline gap-1">
             <span className="text-2xl font-black text-black">{daysWithNotes}</span>
             <span className="text-sm font-bold text-gray-300">/ {totalDaysForProgress} days</span>
          </div>
        </div>
        
        {/* 笔记预览 (只显示当天新建的，因为 study_logs 没有详情) */}
        {selectedDate && selectedDateNotes.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-top-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              {format(selectedDate, 'MMM do')} • Created Notes
            </h3>
            <div className="space-y-2">
              {selectedDateNotes.map(note => {
                 const title = note.title || format(new Date(note.created_at), 'yyyy/MM/dd HH:mm')
                 return (
                <div key={note.id} className="text-sm text-gray-800 truncate">
                  • {title}
                </div>
              )})}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}