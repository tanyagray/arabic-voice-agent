/**
 * Base API client for making HTTP requests to the backend.
 *
 * This client is configured with the base URL and default settings
 * that can be reused across all API service modules.
 */

import axios from 'axios';
import { AppSettings } from '../lib/app-settings';

const baseURL = AppSettings.apiUrl;

/**
 * Axios instance configured for the backend API.
 *
 * Features:
 * - Automatic base URL from environment
 * - JSON content type by default
 * - Automatic JWT token injection from Supabase session
 * - Response/request interceptors for error handling
 */
export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add JWT token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    let supabase;
    try {
      supabase = AppSettings.get().supabase;
    } catch {
      // Config still loading or Storybook — skip auth
      return config;
    }

    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession();

    // If a session exists, add the access token to the Authorization header
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // On 401 (expired/invalid token), try refreshing the session and retry once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const supabase = AppSettings.get().supabase;
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Refresh failed — fall through to error handling below
      }
    }

    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error: No response received');
    } else {
      // Something else happened
      console.error('Request Error:', error.message);
    }

    return Promise.reject(error);
  }
);
