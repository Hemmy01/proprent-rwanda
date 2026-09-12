import api from './client'

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOtp: (email, code) => api.post('/auth/verify-otp', { email, code }),
  logout: (refreshToken) => api.post('/auth/logout', { token: refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
}

export const agentApi = {
  getPending: () => api.get('/agents/pending'),
  getAll: () => api.get('/agents'),
  approve: (userId) => api.post(`/agents/${userId}/approve`),
  reject: (userId) => api.post(`/agents/${userId}/reject`),
  getMyProfile: () => api.get('/agents/me'),
  getMyProperties: () => api.get('/properties/agent/mine'),
  getMyApplications: () => api.get('/applications/agent'),
  getPendingListings: () => api.get('/properties/pending-review'),
  approveListingStatus: (id, status) => api.patch(`/properties/${id}/listing-status`, { status }),
}

export const userApi = {
  getMe: () => api.get('/users/me'),
  getAll: () => api.get('/users'),
  toggleActive: (id) => api.patch(`/users/${id}/toggle-active`),
  updateProfile: (data) => api.put('/users/me', data),
  getPreferences: () => api.get('/users/me/preferences'),
  upsertPreferences: (data) => api.put('/users/me/preferences', data),
}

export const propertyApi = {
  getAll: (params) => api.get('/properties', { params }),
  getFeatured: () => api.get('/properties/featured'),
  getById: (id) => api.get(`/properties/${id}`),
  getSimilar: (id) => api.get(`/properties/${id}/similar`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  toggleAvailability: (id) => api.patch(`/properties/${id}/toggle-availability`),
  delete: (id) => api.delete(`/properties/${id}`),
  uploadImage: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/uploads/image', fd)
  },
}

export const applicationApi = {
  getMine: () => api.get('/applications/my'),
  getAll: () => api.get('/applications'),
  create: (data) => api.post('/applications', data),
  withdraw: (id) => api.delete(`/applications/${id}/withdraw`),
  updateStatus: (id, status) => api.patch(`/applications/${id}/status`, { status }),
  getStats: () => api.get('/applications/stats'),
}

export const wishlistApi = {
  getMine: () => api.get('/wishlist'),
  toggle: (propertyId) => api.post(`/wishlist/${propertyId}`),
  checkStatus: (propertyId) => api.get(`/wishlist/${propertyId}/status`),
}
