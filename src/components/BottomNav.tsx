import { useNavigate, useLocation } from 'react-router-dom'
import { PlusCircle, BarChart2, CheckCircle2 } from 'lucide-react'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path
  
  return (
    // ⭐️ 这里的 pb-6 (或 pb-8) 就是为了避开 iPhone 的底部黑条
    // 你也可以用 pb-[calc(1.5rem+env(safe-area-inset-bottom))] 来做更精确的适配
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 pb-8 flex justify-between items-center z-50">
      
      <button 
        onClick={() => navigate('/record')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/record') ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}
      >
        <BarChart2 size={24} strokeWidth={isActive('/record') ? 2.5 : 2} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Record</span>
      </button>

      <button 
        onClick={() => navigate('/create')}
        className="bg-black text-white rounded-full p-3 shadow-lg hover:scale-105 active:scale-95 transition-all -mt-8 border-4 border-gray-50"
      >
        <PlusCircle size={32} />
      </button>

      <button 
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}
      >
        <CheckCircle2 size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Review</span>
      </button>
      
    </div>
  )
}