import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Image as ImageIcon, Loader2, Send, Eraser, X } from 'lucide-react'
import { useLanguage } from '../lib/i18n'

// 定义遮罩结构
interface Mask {
  id: string
  x: number; y: number; w: number; h: number
}

export default function Input() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [content, setContent] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [masks, setMasks] = useState<Mask[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🎨 绘图状态
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // 检查登录
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate('/login')
    })
  }, [])

  // 📸 选图逻辑
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        alert("图片太大啦 (Max 5MB)")
        return
      }
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
      setMasks([]) // 重置遮罩
    }
  }

  // 🧹 清除图片
  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setMasks([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 🎨 鼠标按下：开始画
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setIsDrawing(true)
  }

  // 🎨 鼠标松开：生成框
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    const rawW = Math.abs(currentX - startPos.x)
    const rawH = Math.abs(currentY - startPos.y)
    const rawX = Math.min(currentX, startPos.x)
    const rawY = Math.min(currentY, startPos.y)

    if (rawW > 5 && rawH > 5) {
        const newMask: Mask = {
            id: Date.now().toString(),
            x: (rawX / rect.width) * 100,
            y: (rawY / rect.height) * 100,
            w: (rawW / rect.width) * 100,
            h: (rawH / rect.height) * 100
        }
        setMasks([...masks, newMask])
    }
    setIsDrawing(false)
  }

  // 💾 保存逻辑
  const handleSubmit = async () => {
    if (!content.trim() && !selectedImage) return
    setIsSubmitting(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('No User'); return }

    let uploadedImageUrl = null

    // 上传图片
    if (selectedImage) {
      const fileExt = selectedImage.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, selectedImage)

      if (uploadError) {
        alert(`Upload failed: ${uploadError.message}`)
        setIsSubmitting(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)
      uploadedImageUrl = publicUrl
    }

    // 存入数据库
    const { error } = await supabase.from('notes').insert([{
      content,
      image_url: uploadedImageUrl,
      masks: masks, // ✅ 别忘了存遮罩数据！
      review_stage: 0,
      next_review_at: new Date().toISOString(),
      user_id: user.id
    }])

    if (!error) {
      navigate('/') // 成功后回首页
    } else {
      alert(`Error: ${error.message}`)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部导航 */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900">New Memory</h1>
        <div className="w-10"></div> {/* 占位符，保持标题居中 */}
      </div>

      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        {/* 文本输入 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t.input_placeholder}
          className="w-full text-lg resize-none outline-none placeholder:text-gray-300 min-h-[120px]"
          autoFocus
        />

        {/* 🖼️ 绘图区域 */}
        {imagePreview ? (
          <div className="relative mt-4 border rounded-xl overflow-hidden select-none touch-none bg-gray-50">
            {/* 绘图遮罩层 */}
            <div 
                className="absolute inset-0 z-10 cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsDrawing(false)}
                // 移动端/触摸屏简单支持（这里主要适配鼠标，复杂触摸需更多代码）
            ></div>
            
            <img ref={imgRef} src={imagePreview} className="w-full h-auto block" alt="preview" />
            
            {/* 渲染已画的框 */}
            {masks.map(mask => (
                <div key={mask.id} className="absolute bg-orange-500/60 border border-white shadow-sm" style={{left:`${mask.x}%`, top:`${mask.y}%`, width:`${mask.w}%`, height:`${mask.h}%`}}></div>
            ))}

            {/* 清除图片按钮 */}
            <button onClick={clearImage} className="absolute top-2 right-2 z-20 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition-colors">
                <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
            // 上传占位区
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 border-2 border-dashed border-gray-200 rounded-xl h-32 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer gap-2"
            >
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm font-medium">Add Image & Draw Masks</span>
            </div>
        )}
        
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
        
        {/* 工具栏：撤销 */}
        {masks.length > 0 && (
            <div className="flex justify-end mt-2">
                 <button onClick={() => setMasks(prev => prev.slice(0, -1))} className="text-sm text-red-500 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded">
                    <Eraser className="w-4 h-4" /> Undo Mask
                 </button>
            </div>
        )}

      </div>

      {/* 底部发送栏 */}
      <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
        <div className="max-w-2xl mx-auto">
            <button 
                onClick={handleSubmit}
                disabled={(!content.trim() && !selectedImage) || isSubmitting}
                className="w-full bg-black text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95"
            >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Save Memory
            </button>
        </div>
      </div>
    </div>
  )
}