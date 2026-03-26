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

export default apiClient
