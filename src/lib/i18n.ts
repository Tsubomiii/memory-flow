import { useState } from 'react'

// 1. 字典内容 (保持不变)
export const translations = {
  en: {
    app_title: "Memory Flow",
    review_section: "Review Today",
    all_memories: "All Memories",
    loading: "Loading memories...",
    empty_review: "You're all caught up! 🎉",
    input_placeholder: "What's on your mind?",
    save: "Save Memory",
    back: "Back",
    login_title: "Welcome Back",
    login_desc: "Sign in to sync your memories",
    email_label: "Email address",
    password_label: "Password",
    btn_login: "Sign In",
    btn_signup: "Sign Up",
    link_signup: "Don't have an account? Sign up",
    link_login: "Already have an account? Sign in",
  },
  zh: {
    app_title: "记忆心流",
    review_section: "今日需复习",
    all_memories: "所有记忆",
    loading: "加载记忆中...",
    empty_review: "今日复习已完成！🎉",
    input_placeholder: "此刻你在想什么？",
    save: "保存记忆",
    back: "返回",
    login_title: "欢迎回来",
    login_desc: "请登录以同步你的记忆",
    email_label: "邮箱地址",
    password_label: "密码",
    btn_login: "登录",
    btn_signup: "注册",
    link_signup: "没有账号？点此注册",
    link_login: "已有账号？直接登录",
  },
  ja: {
    app_title: "Memory Flow",
    review_section: "本日の復習",
    all_memories: "すべての記憶",
    loading: "読み込み中...",
    empty_review: "本日の復習は完了です！🎉",
    input_placeholder: "今、何を考えていますか？",
    save: "保存",
    back: "戻る",
    login_title: "おかえりなさい",
    login_desc: "ログインして同期を開始",
    email_label: "メールアドレス",
    password_label: "パスワード",
    btn_login: "ログイン",
    btn_signup: "新規登録",
    link_signup: "アカウントをお持ちでない方",
    link_login: "すでにアカウントをお持ちの方",
  }
}

type Lang = 'en' | 'zh' | 'ja'

// 2. 智能语言 Hook
export function useLanguage() {
  const [lang, setLang] = useState<Lang>(() => {
    // 🕵️ 第一步：先看看本地以前存没存过
    const saved = localStorage.getItem('app_lang') as Lang
    if (saved) return saved

    // 🕵️ 第二步：没存过，就偷看一眼用户的浏览器/手机语言
    // navigator.language 通常长这样：'zh-CN', 'ja-JP', 'en-US'
    // 我们只需要横杠前面那部分
    const browserLang = navigator.language.split('-')[0] 

    // 🕵️ 第三步：看看这个语言我们支不支持
    if (browserLang === 'zh') return 'zh'
    if (browserLang === 'ja') return 'ja'
    
    // 如果是法语、德语等其他语言，默认回退到英文
    return 'en'
  })

  // 切换语言时，顺便存到本地，下次他就记住你的选择了
  const changeLang = (l: Lang) => {
    setLang(l)
    localStorage.setItem('app_lang', l)
  }

  return { lang, changeLang, t: translations[lang] }
}