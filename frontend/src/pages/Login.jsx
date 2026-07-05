import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fingerprintMode, setFingerprintMode] = useState(false)
  const [fingerprintHash, setFingerprintHash] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      let res
      if (fingerprintMode) {
        res = await api.post('/auth/fingerprint-login', {
          fingerprint_hash: fingerprintHash,
        })
      } else {
        res = await api.post('/auth/login', { username, password })
      }
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('username', res.data.username)
      localStorage.setItem('userId', res.data.user_id)
      console.log('Login success, token:', res.data.access_token?.substring(0, 20))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="car-icon">🚗</div>
        <h1>Smart Car System</h1>
        <p className="subtitle">Personalized driving experience</p>

        <div className="auth-toggle">
          <button
            type="button"
            className={!fingerprintMode ? 'active' : ''}
            onClick={() => setFingerprintMode(false)}
          >
            Password
          </button>
          <button
            type="button"
            className={fingerprintMode ? 'active' : ''}
            onClick={() => setFingerprintMode(true)}
          >
            🔒 Fingerprint
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleLogin}>
          {fingerprintMode ? (
            <div className="form-group">
              <label htmlFor="fingerprint-hash">Fingerprint ID</label>
              <input
                id="fingerprint-hash"
                type="text"
                placeholder="Scan fingerprint or enter hash"
                value={fingerprintHash}
                onChange={(e) => setFingerprintHash(e.target.value)}
                required
              />
              <small>Connect a fingerprint device or enter your registered hash</small>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="login-username">Username</label>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          <button type="submit" className="btn-primary">Login</button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}
