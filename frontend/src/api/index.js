import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

// Tickets
export const submitTicket     = (data)   => api.post('/tickets/', data)
export const getTickets       = (params) => api.get('/tickets/', { params })
export const getTicket        = (id)     => api.get(`/tickets/${id}`)
export const getTicketHistory = (id)     => api.get(`/tickets/${id}/history`)
export const updateStatus     = (id, status, note, performed_by) =>
  api.patch(`/tickets/${id}/status`, null, { params: { status, note, performed_by } })
export const addNote          = (id, data) => api.post(`/tickets/${id}/notes`, data)
export const reassignTicket   = (id, employee_id) =>
  api.patch(`/tickets/${id}/reassign`, null, { params: { employee_id } })
export const submitFeedback   = (id, helpful) =>
  api.patch(`/tickets/${id}/feedback`, null, { params: { helpful } })

// Employees
export const getEmployees       = (params) => api.get('/employees/', { params })
export const createEmployee     = (data)   => api.post('/employees/', data)
export const updateEmployee     = (id, data) => api.patch(`/employees/${id}`, data)
export const deactivateEmployee = (id)     => api.delete(`/employees/${id}`)

// Analytics
export const getSummary       = () => api.get('/analytics/summary')
export const getDeptLoad      = () => api.get('/analytics/department-load')
export const getAvgResolution = () => api.get('/analytics/avg-resolution-time')
export const getTopCategories = () => api.get('/analytics/top-categories')
export const getSeverity      = () => api.get('/analytics/severity-breakdown')

// Notifications
export const getNotifications     = ()   => api.get('/tickets/notifications/all')
export const markNotificationRead = (id) => api.patch(`/tickets/notifications/${id}/read`)

// SSE — real-time updates
export function subscribeToTickets(onEvent) {
  const es = new EventSource('http://localhost:8000/tickets/stream')

  es.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data)
      if (event.type !== 'connected') {
        onEvent(event)
      }
    } catch (err) {
      console.warn('SSE parse error:', err)
    }
  }

  es.onerror = (err) => {
    console.warn('SSE connection error, auto-reconnecting...', err)
  }

  return () => es.close()
}