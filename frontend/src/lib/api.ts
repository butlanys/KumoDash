import axios from 'axios'
import i18n from '@/i18n'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

/**
 * Get common headers for API requests including language preference
 */
export function getApiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept-Language': i18n.language || 'zh-CN',
  }
}

// Flag to prevent multiple refresh attempts
let isRefreshing = false

// Request interceptor for adding token and language
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Add Accept-Language header for i18n
    config.headers['Accept-Language'] = i18n.language || 'zh-CN'
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Skip refresh logic for refresh endpoint itself
    if (originalRequest.url === '/auth/refresh') {
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/404'
      return Promise.reject(error)
    }
    
    // If error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
      originalRequest._retry = true
      isRefreshing = true
      
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          // Use axios directly to avoid interceptor loop
          const response = await axios.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept-Language': i18n.language || 'zh-CN',
            }
          })
          
          const { access_token, refresh_token } = response.data.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          
          isRefreshing = false
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        isRefreshing = false
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/404'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
