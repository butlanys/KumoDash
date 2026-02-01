import { useState, useContext, createContext, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'

interface AuthContextType {
  user: any
  login: (credentials: { username: string; password: string; authPath: string }) => Promise<any>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        const accessToken = localStorage.getItem('access_token')
        
        if (storedUser && accessToken) {
          try {
            setUser(JSON.parse(storedUser))
          } catch (error) {
            console.error('Failed to parse stored user:', error)
            localStorage.removeItem('user')
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (credentials: { username: string; password: string; authPath: string }) => {
    try {
      const response = await api.post('/auth/login', {
        username: credentials.username,
        password: credentials.password,
        auth_path: credentials.authPath
      })
      
      const { access_token, refresh_token, user: userData } = response.data.data
      
      // Store tokens and user data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      setUser(userData)
      toast.success('登录成功！')
      
      // Use window.location for a full page navigation to ensure clean routing
      window.location.href = '/'
      
      return response.data
    } catch (error: any) {
      console.error('Login failed:', error)
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || '无效的凭据'
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        const response = await api.post('/auth/logout', {
          refresh_token: refreshToken
        })
        
        // Clear all auth data
        setUser(null)
        localStorage.removeItem('user')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        
        toast.success('退出成功！')
        
        // Use login_path from response for redirect
        const loginPath = response.data?.data?.login_path || '/login'
        navigate(loginPath)
        return
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
    
    // Fallback: clear data and redirect to /login
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    toast.success('退出成功！')
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

