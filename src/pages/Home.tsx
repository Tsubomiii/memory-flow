import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, CheckCircle2, Clock, Globe, AlertTriangle, Send, Loader2, LogOut, Image as ImageIcon, X, Eraser, Mail, Lock, Settings, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../lib/i18n'

// ==========================================
// 1. 数据类型
// ==========================================
interface Mask { id: string; x: number; y: number; w: number; h: number }
interface Note { id: number; content: string; image_url?: string | null; masks?: Mask[] | null; created_at: string; review_stage: number; next_review_at: string; user_id: string }
const REVIEW_INTERVALS = [1, 3, 7, 14, 30]

// ==========================================
// 2. 图片组件
// ==========================================
const InteractiveImage = ({ src, masks }: { src: string, masks?: Mask[] | null }) => {
  const [revealedIds, setRevealedIds] = useState<string[]>([])
  const toggleReveal = (id: string) => { setRevealedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) }
  return (
    <div className="relative mt-3 inline-block w-full group">
      <img src={src} className="w-full h-auto rounded-lg border border-gray-100" alt="note" />
      {masks && masks.map(mask => (
        <div key={mask.id} onClick={(e) => { e.stopPropagation(); toggleReveal(mask.id); }}
          className={`absolute border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-sm ${revealedIds.includes(mask.id) ? 'bg-transparent border-orange-400/30' : 'bg-orange-500 border-orange-500'}`}
          style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.w}%`, height: `${mask.h}%` }}
        />
      ))}
    </div>
  )
}

// ==========================================
// 3. 主页面
// ==========================================
export default function Home() {
  const { lang, changeLang, t } = useLanguage()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showLangMenu, setShowLangMenu] = useState(false)
  
  // 📝 输入与绘图状态
  const [newContent, setNewContent] = useState(''); const [selectedImage, setSelectedImage] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState<string | null>(null); const [masks, setMasks] = useState<Mask[]>([]); const [isDrawing, setIsDrawing] = useState(false); const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isAnonymous, setIsAnonymous] = useState(false) 
  const [currentUserEmail, setCurrentUserEmail] = useState<string | undefined>('')

  // 🔐 注册/升级/设置相关
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false) // ✨ 新增：设置弹窗
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null); const imgRef = useRef<HTMLImageElement>(null); const navigate = useNavigate()

  useEffect(() => { checkUser(); fetchNotes() }, [])
  
  const checkUser = async () => { 
    const { data: { user } } = await supabase.auth.getUser(); 
    if (user?.is_anonymous) {
      setIsAnonymous(true) 
    } else {
      setCurrentUserEmail(user?.email) // 记录当前邮箱
    }
  }
  
  const fetchNotes = async () => { const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false }); if (!error) setNotes(data || []); setLoading(false) }

  // ... (省略重复逻辑) ...
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { if(e.target.files[0].size > 5*1024*1024) return; setSelectedImage(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); setMasks([]) } }
  const clearImage = () => { setSelectedImage(null); setImagePreview(null); setMasks([]); if (fileInputRef.current) fileInputRef.current.value = '' }
  const handleMouseDown = (e: React.MouseEvent) => { if (!imgRef.current) return; const rect = imgRef.current.getBoundingClientRect(); setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); setIsDrawing(true) }
  const handleMouseUp = (e: React.MouseEvent) => { if (!isDrawing || !imgRef.current) return; const rect = imgRef.current.getBoundingClientRect(); const w = Math.abs((e.clientX-rect.left)-startPos.x); if(w>5) setMasks([...masks, { id: Date.now().toString(), x: (Math.min(e.clientX-rect.left, startPos.x)/rect.width)*100, y: (Math.min(e.clientY-rect.top, startPos.y)/rect.height)*100, w: (w/rect.width)*100, h: (Math.abs((e.clientY-rect.top)-startPos.y)/rect.height)*100 }]); setIsDrawing(false) }
  const undoMask = () => setMasks(prev => prev.slice(0, -1))
  const handleAddFirstNote = async () => { if (!newContent.trim() && !selectedImage) return; setIsSubmitting(true); const { data: { user } } = await supabase.auth.getUser(); if (!user) return; let url = null; if (selectedImage) { const name = `${Math.random()}.${selectedImage.name.split('.').pop()}`; await supabase.storage.from('photos').upload(`${user.id}/${name}`, selectedImage); url = supabase.storage.from('photos').getPublicUrl(`${user.id}/${name}`).data.publicUrl } await supabase.from('notes').insert([{ content: newContent, image_url: url, masks, review_stage: 0, next_review_at: new Date().toISOString(), user_id: user.id }]); const {data} = await supabase.from('notes').select().order('created_at', {ascending: false}).limit(1); if(data) { setNotes([data[0], ...notes]); setNewContent(''); clearImage() }; setIsSubmitting(false) }
  const handleReview = async (note: Note) => { const nextStage = note.review_stage + 1; const days = REVIEW_INTERVALS[note.review_stage] || 30; const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + days); setNotes(notes.map(n => n.id === note.id ? { ...n, review_stage: nextStage, next_review_at: nextDate.toISOString() } : n)); await supabase.from('notes').update({ review_stage: nextStage, next_review_at: nextDate.toISOString() }).eq('id', note.id) }
  const handleDelete = async (id: number) => { if (!confirm('Delete?')) return; setNotes(prev => prev.filter(n => n.id !== id)); await supabase.from('notes').delete().eq('id', id) }
  const handleLogout = async () => { if (isAnonymous && !confirm('游客数据将丢失，确定退出？')) return; await supabase.auth.signOut(); navigate('/login'); window.location.reload() }

  const handleUpgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setIsRegistering(true)
    const { error } = await supabase.auth.updateUser({ email: registerEmail, password: registerPassword })
    if (error) { alert(`升级失败: ${error.message}`) } else { setRegisterSuccess(true) }
    setIsRegistering(false)
  }

  // ✨ 新增：补全密码/修改密码逻辑
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerPassword) return
    setIsRegistering(true)
    const { error } = await supabase.auth.updateUser({ password: registerPassword })
    
    if (error) {
        alert(`设置失败: ${error.message}`)
    } else {
        alert("🎉 密码设置成功！下次你可以用 邮箱+密码 登录了。")
        setShowSettingsModal(false)
        setRegisterPassword('')
    }
    setIsRegistering(false)
  }

  // ----------------------------------------------------
  if (loading) return <div className="p-10 text-center text-gray-400">{t.loading}</div>
  const now = new Date(); const dueNotes = notes.filter(n => new Date(n.next_review_at) <= now); const otherNotes = notes.filter(n => new Date(n.next_review_at) > now); const isEmptyState = notes.length === 0

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-gray-50 relative pb-32">
      {isAnonymous && (
        <div className="bg-orange-50 border-b border-orange-100 p-3 px-6 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
          <div className="flex-1"><p className="text-sm text-orange-800 font-bold">{lang === 'zh'?'正在试用游客模式':'Guest Mode'}</p><p className="text-xs text-orange-600">{lang === 'zh'?'绑定邮箱密码，防止丢失':'Bind email/password to save.'}</p></div>
          <button onClick={() => setShowRegisterModal(true)} className="text-xs bg-gray-900 text-white border border-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-800 shadow-sm active:scale-95">{lang === 'zh'?'☁️ 永久保存':'Save Data'}</button>
        </div>
      )}

      {/* ✨ 账号设置弹窗 (补全密码用) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative">
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-4"><User className="w-6 h-6" /></div>
                <h3 className="text-xl font-black text-gray-900 mb-1">账号设置</h3>
                <p className="text-gray-500 text-sm mb-6">当前账号: {currentUserEmail}</p>
                <form onSubmit={handleUpdatePassword} className="space-y-4 text-left">
                  <div className="relative">
                    <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                    <input type="password" required placeholder="设置新密码" minLength={6} value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-black font-medium text-gray-900" />
                  </div>
                  <button type="submit" disabled={isRegistering} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2">{isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : '更新密码'}</button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* ... 省略注册弹窗 (保持不变，用于游客升级) ... */}
      {showRegisterModal && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden"><button onClick={() => setShowRegisterModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>{registerSuccess ? (<div className="text-center py-8"><div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Mail className="w-8 h-8" /></div><h3 className="text-xl font-bold text-gray-900 mb-2">验证邮件已发送</h3><p className="text-gray-500 text-sm mb-6">请去邮箱 <strong>{registerEmail}</strong> 点击链接激活账号。<br/>激活后，您就可以用<span className="font-bold text-black">密码</span>登录了！</p><button onClick={() => setShowRegisterModal(false)} className="w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-200">我知道了</button></div>) : (<div className="text-center"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock className="w-6 h-6" /></div><h3 className="text-xl font-black text-gray-900 mb-1">创建账号</h3><p className="text-gray-500 text-sm mb-6">设置邮箱和密码，永久保存您的记忆。</p><form onSubmit={handleUpgradeAccount} className="space-y-4"><div className="relative"><Mail className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" /><input type="email" required placeholder="Email" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-black font-medium text-gray-900" /></div><div className="relative"><Lock className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" /><input type="password" required placeholder="设置密码 (至少6位)" minLength={6} value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-black font-medium text-gray-900" /></div><button type="submit" disabled={isRegistering} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2">{isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : '立即绑定'}</button></form></div>)}</div></div>)}

      <div className="p-6 space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t.app_title}</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowLangMenu(!showLangMenu)}><Globe className="w-5 h-5 text-gray-600" /></button>
            {showLangMenu && <div className="absolute right-12 top-12 bg-white shadow-xl border rounded-xl p-2 z-50 flex flex-col gap-2"><button onClick={()=>changeLang('zh')}>中文</button><button onClick={()=>changeLang('en')}>EN</button></div>}
            
            {/* ✨ 新增：设置按钮 (只有非游客才显示，或者都显示) */}
            {!isAnonymous && (
              <button onClick={() => setShowSettingsModal(true)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            )}

            <button onClick={handleLogout}><LogOut className="w-5 h-5 text-gray-400" /></button>
          </div>
        </header>

        {isEmptyState ? (
          <div className="flex flex-col items-center justify-center pt-4 animate-in fade-in zoom-in duration-500">
             <div className="w-full bg-white p-6 rounded-3xl shadow-lg border border-indigo-50">
                <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="添加一点备注..." className="w-full resize-none outline-none text-gray-800 placeholder:text-gray-300 min-h-[40px] mb-4 bg-transparent" />
                {imagePreview ? (
                  <div className="relative mb-4 border-2 border-dashed border-indigo-100 rounded-lg overflow-hidden select-none touch-none">
                    <div className="absolute inset-0 z-10 cursor-crosshair" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={() => setIsDrawing(false)}></div>
                    <img ref={imgRef} src={imagePreview} className="w-full h-auto block" />
                    {masks.map(mask => (<div key={mask.id} className="absolute bg-orange-500/60 border border-white/50" style={{left:`${mask.x}%`, top:`${mask.y}%`, width:`${mask.w}%`, height:`${mask.h}%`}}></div>))}
                  </div>
                ) : ( <div className="h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 mb-4">预览区域</div> )}
                <div className="flex justify-between items-center pt-2">
                   <div className="flex gap-3"><button onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-indigo-600 bg-gray-100 p-2 rounded-lg transition-colors flex items-center gap-2"><ImageIcon className="w-5 h-5" /> <span className="text-xs font-bold">选图</span></button>{masks.length > 0 && (<button onClick={undoMask} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2"><Eraser className="w-5 h-5" /> <span className="text-xs font-bold">撤销</span></button>)}<input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" /></div>
                   <button onClick={handleAddFirstNote} disabled={(!newContent.trim() && !selectedImage) || isSubmitting} className="bg-black text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t.save}</button>
                </div>
             </div>
          </div>
        ) : (
          <>
            {dueNotes.length > 0 && (
              <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg"><Clock className="w-5 h-5" /><h2>{t.review_section} ({dueNotes.length})</h2></div>
                <div className="grid gap-6">{dueNotes.map(note => (<div key={note.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">{note.content && <p className="text-gray-800 mb-2 font-medium">{note.content}</p>}{note.image_url && <InteractiveImage src={note.image_url} masks={note.masks} />}<div className="flex justify-end mt-4 pt-3 border-t border-gray-50"><button onClick={() => handleReview(note)} className="flex items-center gap-2 text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg font-bold transition-colors"><CheckCircle2 className="w-5 h-5" /> 记住了</button></div></div>))}</div>
              </section>
            )}
            <section className="space-y-4 animate-in fade-in duration-500 delay-150">
              <h2 className="text-gray-400 font-bold text-sm uppercase tracking-wider ml-1">{t.all_memories}</h2>
              <div className="grid gap-3">{otherNotes.map(note => (<div key={note.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group"><div className="flex justify-between items-start mb-2"><p className="text-gray-600 text-sm">{note.content}</p><button onClick={() => handleDelete(note.id)} className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button></div>{note.image_url && <InteractiveImage src={note.image_url} masks={note.masks} />}</div>))}</div>
            </section>
            <div className="fixed bottom-0 left-0 right-0 w-full max-w-2xl mx-auto px-6 pb-8 z-50 pointer-events-none flex justify-end"><Link to="/input" className="bg-black text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 pointer-events-auto"><Plus className="w-6 h-6" /></Link></div>
          </>
        )}
      </div>
    </div>
  )
}