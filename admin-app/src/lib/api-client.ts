import axios from 'axios'
import { supabase } from './supabase'

if (!import.meta.env.VITE_API_URL) {
  throw new Error(
    'VITE_API_URL is not set. In development, add it to admin-app/.env. ' +
      'In production, set it as a build-time environment variable.',
  )
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
