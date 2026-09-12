import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Let the browser set Content-Type for FormData (multipart)
  if (config.data instanceof FormData)
    delete config.headers['Content-Type']
  return config
})

// Queue for concurrent 401s — only one refresh call at a time
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    const isAuthEndpoint = original.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        }).catch(err => Promise.reject(err))
      }

      original._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post('/api/auth/refresh', { token: refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
        processQueue(null, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
