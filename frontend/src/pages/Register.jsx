import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Register() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', full_name: '',
    is_learner: false, fingerprint_hash: '', owner_key: '',
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form }
      if (!payload.fingerprint_hash) delete payload.fingerprint_hash
      const res = await api.post('/auth/register', payload)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('username', res.data.username)
      localStorage.setItem('userId', res.data.user_id)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="car-icon">🚗</div>
        <h1>Create Account</h1>
        <p className="subtitle">Set up your driver profile</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="reg-ownerkey">Owner Key</label>
            <input id="reg-ownerkey" type="password" placeholder="Enter car owner key"
              value={form.owner_key} onChange={(e) => update('owner_key', e.target.value)} required />
            <small>Only the car owner can register new drivers</small>
          </div>
          <div className="form-group">
            <label htmlFor="reg-fullname">Full Name</label>
            <input id="reg-fullname" type="text" placeholder="Full Name"
              value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="reg-username">Username</label>
            <input id="reg-username" type="text" placeholder="Username"
              value={form.username} onChange={(e) => update('username', e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" placeholder="Email"
              value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" placeholder="Password"
              value={form.password} onChange={(e) => update('password', e.target.value)} required />
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={form.is_learner}
                onChange={(e) => update('is_learner', e.target.checked)} />
              I am a learner driver (speed limit will be enforced)
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="reg-fingerprint">Fingerprint Hash (optional)</label>
            <input id="reg-fingerprint" type="text" placeholder="Connect device or enter hash"
              value={form.fingerprint_hash} onChange={(e) => update('fingerprint_hash', e.target.value)} />
            <small>Optional — for fingerprint-based car unlock</small>
          </div>
          <button type="submit" className="btn-primary">Register</button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
