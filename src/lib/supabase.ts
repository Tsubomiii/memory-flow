import { createClient } from '@supabase/supabase-js'

// ⚠️ 请直接在这里填入你的真实数据 (注意要保留引号)
const supabaseUrl = 'https://fncwczbwyqzjlguhsmnf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY3djemJ3eXF6amxndWhzbW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODU0MjUsImV4cCI6MjA4NDQ2MTQyNX0.dhdT24P3IDY7ziShbe2Dk8h_CLbacBR5yeTIlOlS1AM'

// 创建客户端
export const supabase = createClient(supabaseUrl, supabaseKey)
