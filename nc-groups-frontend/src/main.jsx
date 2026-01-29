import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { isAuthenticated } from './api/client'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './index.css'

function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated())

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  return <Dashboard />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
