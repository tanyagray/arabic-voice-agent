/**
 * Base API client for making HTTP requests to the backend.
 *
 * This client is configured with the base URL and default settings
 * that can be reused across all API service modules.
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';

// Note: supabase may be null if env vars are missing (e.g., in Storybook)
// The interceptor handles this gracefully by not adding auth headers

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    // Skip auth if Supabase is not configured (e.g., in Storybook)
    if (!supabase) {
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
  (error) => {
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
