import axios from 'axios'
import { AppSettings } from './app-settings'

const apiClient = axios.create({
  baseURL: AppSettings.apiUrl,
})

apiClient.interceptors.request.use(async (config) => {
  const { supabase } = AppSettings.get()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { supabase } = AppSettings.get()
      await supabase.auth.signOut()
    }
    return Promise.reject(error)
  },
)

export default apiClient
