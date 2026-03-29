import { useState, useEffect } from 'react'
import apiClient from '../lib/api-client'

const STORAGE_KEY = 'admin-selected-language'

export function useLanguage() {
  const [language, setLanguageState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || ''
  )
  const [languages, setLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<string[]>('/admin/prompts/languages')
      .then((res) => {
        setLanguages(res.data)
        // If no language selected or selected language no longer exists, pick first
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored || !res.data.includes(stored)) {
          const first = res.data[0] || ''
          setLanguageState(first)
          localStorage.setItem(STORAGE_KEY, first)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function setLanguage(lang: string) {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  return { language, languages, loading, setLanguage }
}
