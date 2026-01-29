// API Client for NC Groups Backend

const API_BASE = import.meta.env.VITE_API_URL || 'https://ncgroups-api-production.up.railway.app'

// Token management
let authToken = localStorage.getItem('ncgroups_token')

export const setToken = (token) => {
  authToken = token
  if (token) {
    localStorage.setItem('ncgroups_token', token)
  } else {
    localStorage.removeItem('ncgroups_token')
  }
}

export const getToken = () => authToken

export const isAuthenticated = () => !!authToken

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    // Token expired or invalid
    setToken(null)
    window.location.reload()
    throw new Error('Session expired')
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

// Auth
export const login = async (username, password) => {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

  if (data.token) {
    setToken(data.token)
  }

  return data
}

export const logout = () => {
  setToken(null)
  window.location.reload()
}

// People
export const getPeople = async () => {
  const data = await apiRequest('/api/people')
  return { people: data.people || [] }
}

export const createPerson = async (personData) => {
  return apiRequest('/api/people', {
    method: 'POST',
    body: JSON.stringify(personData),
  })
}

// Groups
export const getGroups = async () => {
  const data = await apiRequest('/api/groups')
  return { groups: data.groups || [] }
}

export const createGroup = async (groupData) => {
  return apiRequest('/api/groups', {
    method: 'POST',
    body: JSON.stringify(groupData),
  })
}

// Text Blast
export const sendTextBlast = async (message, filters) => {
  return apiRequest('/api/text-blast', {
    method: 'POST',
    body: JSON.stringify({ message, filters }),
  })
}

// Generate SMS URI for native group texting
export const getSmsUri = async (filters) => {
  // Get filtered people and build SMS URI
  const { people } = await getPeople()

  const filtered = people.filter(person => {
    if (!person.phone || person.isOptedOut) return false
    if (filters.groupId) {
      const inGroup = person.groups?.some(g => g.id === filters.groupId)
      if (!inGroup) return false
    }
    if (filters.ageGroup && person.ageGroup !== filters.ageGroup) return false
    if (filters.gender && person.gender !== filters.gender) return false
    return true
  })

  const phones = filtered.map(p => p.phone).filter(Boolean)

  // iOS uses '&' for multiple recipients, others usually use ','
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const separator = isIOS ? '&' : ','
  
  const smsUri = `sms:${phones.join(separator)}`

  return { smsUri, count: phones.length }
}
