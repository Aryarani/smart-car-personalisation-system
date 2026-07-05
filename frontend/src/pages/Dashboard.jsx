import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import BootSequence from './BootSequence'
import MusicPlayer from '../components/MusicPlayer'

const GENRES = ['pop','rock','jazz','classical','hip-hop','electronic','country','r&b','metal','indie']

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [suggestions, setSuggestions] = useState(null)
  const [outsideTemp, setOutsideTemp] = useState(30)
  const [loading, setLoading] = useState(true)
  const [booting, setBooting] = useState(true)
  const [dashVisible, setDashVisible] = useState(false)
  const [trainStatus, setTrainStatus] = useState(null)
  const navigate = useNavigate()
  const username = localStorage.getItem('username')

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, suggestRes] = await Promise.all([
        api.get('/profile/'),
        api.get(`/driving/suggestions?outside_temp=${outsideTemp}`),
      ])
      setProfile(profileRes.data)
      setSuggestions(suggestRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [outsideTemp])

  useEffect(() => { fetchData() }, [fetchData])

  const updateProfile = async (updates) => {
    try {
      const res = await api.put('/profile/', updates)
      setProfile(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const applySuggestions = async () => {
    if (!suggestions) return
    await updateProfile({
      ac_temp_preference: suggestions.suggested_ac_temp,
      music_genre: suggestions.suggested_music_genre,
      seat_position: suggestions.suggested_seat,
      speed_limit: suggestions.suggested_speed_limit,
    })
    // Log this as an interaction for future training
    const now = new Date()
    await api.post('/driving/interaction', {
      outside_temp: outsideTemp,
      set_ac_temp: suggestions.suggested_ac_temp,
      time_of_day: now.getHours(),
      day_of_week: now.getDay(),
      music_genre_chosen: suggestions.suggested_music_genre,
      seat_height: suggestions.suggested_seat.height,
      seat_recline: suggestions.suggested_seat.recline,
      seat_distance: suggestions.suggested_seat.distance,
      speed_driven: null,
    })
  }

  const logManualInteraction = async () => {
    if (!profile) return
    const now = new Date()
    await api.post('/driving/interaction', {
      outside_temp: outsideTemp,
      set_ac_temp: profile.ac_temp_preference,
      time_of_day: now.getHours(),
      day_of_week: now.getDay(),
      music_genre_chosen: profile.music_genre,
      seat_height: profile.seat_position.height,
      seat_recline: profile.seat_position.recline,
      seat_distance: profile.seat_position.distance,
      speed_driven: null,
    })
    setTrainStatus('Preference saved. Keep saving to improve AI suggestions.')
    setTimeout(() => setTrainStatus(null), 3000)
  }

  const trainNow = async () => {
    setTrainStatus('training')
    try {
      const res = await api.post('/driving/train')
      const data = res.data
      if (data.status === 'insufficient_data') {
        setTrainStatus(`Need more data — only ${data.count} interactions logged (minimum 3). Use "Save Current Settings" a few times first.`)
      } else {
        setTrainStatus(`Model trained on ${data.sample_count} interactions across ${data.users_trained} driver(s).`)
        fetchData()
      }
    } catch (err) {
      setTrainStatus('Training failed. Check console.')
      console.error(err)
    }
    setTimeout(() => setTrainStatus(null), 5000)
  }

  const logout = () => {
    localStorage.clear()
    navigate('/login')
  }

  if (loading) return <div className="loading">Loading your car profile...</div>
  if (!profile) return <div className="loading">Error loading profile</div>

  if (booting) {
    return <BootSequence username={username} onComplete={() => { setBooting(false); setDashVisible(true) }} />
  }

  return (
    <div className={`dashboard ${dashVisible ? 'dash-enter' : ''}`}>
      <header className="dash-header">
        <div className="header-left">
          <span className="car-icon">🚗</span>
          <h1>Smart Car Dashboard</h1>
        </div>
        <div className="header-right">
          <span>Welcome, {username}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </header>

      {/* AI Suggestions Banner */}
      {suggestions && suggestions.confidence > 0 && (
        <div className="suggestions-banner">
          <h3>🤖 AI Suggestions (Confidence: {(suggestions.confidence * 100).toFixed(0)}%)</h3>
          <div className="suggestion-items">
            <span>AC: {suggestions.suggested_ac_temp}°C</span>
            <span>Music: {suggestions.suggested_music_genre}</span>
            <span>Seat H: {suggestions.suggested_seat.height}</span>
            {suggestions.suggested_speed_limit && (
              <span>Speed Limit: {suggestions.suggested_speed_limit} km/h</span>
            )}
          </div>
          <div className="suggestion-actions">
            <button onClick={applySuggestions} className="btn-apply">Apply All Suggestions</button>
            <small>Last trained: {suggestions.model_last_trained || 'Not yet'}</small>
          </div>
        </div>
      )}

      {/* Outside Temperature Simulator */}
      <div className="control-card">
        <h3>🌡️ Outside Temperature (Simulator)</h3>
        <div className="slider-group">
          <input type="range" min="-10" max="50" value={outsideTemp}
            onChange={(e) => setOutsideTemp(Number(e.target.value))} />
          <span className="slider-value">{outsideTemp}°C</span>
        </div>
        <button onClick={fetchData} className="btn-secondary">Refresh Suggestions</button>
      </div>

      {/* AC Temperature */}
      <div className="control-card">
        <div className="card-header">
          <h3>❄️ AC Temperature</h3>
          <label className="auto-toggle">
            <input type="checkbox" checked={profile.auto_ac}
              onChange={(e) => updateProfile({ auto_ac: e.target.checked })} />
            Auto
          </label>
        </div>
        <div className="slider-group">
          <input type="range" min="16" max="30" step="0.5"
            value={profile.ac_temp_preference}
            disabled={profile.auto_ac}
            onChange={(e) => updateProfile({ ac_temp_preference: Number(e.target.value) })} />
          <span className="slider-value">{profile.ac_temp_preference}°C</span>
        </div>
      </div>

      {/* Music */}
      <div className="control-card">
        <div className="card-header">
          <h3>🎵 Music Genre</h3>
          <label className="auto-toggle">
            <input type="checkbox" checked={profile.auto_music}
              onChange={(e) => updateProfile({ auto_music: e.target.checked })} />
            Auto
          </label>
        </div>
        <div className="genre-grid">
          {GENRES.map((g) => (
            <button key={g}
              className={`genre-btn ${profile.music_genre === g ? 'active' : ''}`}
              disabled={profile.auto_music}
              onClick={() => updateProfile({ music_genre: g })}>
              {g}
            </button>
          ))}
        </div>
        <MusicPlayer genre={profile.music_genre} autoPlay={profile.auto_music} />
      </div>

      {/* Seat Position */}
      <div className="control-card">
        <div className="card-header">
          <h3>💺 Seat Position</h3>
          <label className="auto-toggle">
            <input type="checkbox" checked={profile.auto_seat}
              onChange={(e) => updateProfile({ auto_seat: e.target.checked })} />
            Auto
          </label>
        </div>
        {['height', 'recline', 'distance'].map((key) => (
          <div className="slider-group" key={key}>
            <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
            <input type="range" min="0" max="100"
              value={profile.seat_position[key]}
              disabled={profile.auto_seat}
              onChange={(e) => updateProfile({
                seat_position: { ...profile.seat_position, [key]: Number(e.target.value) }
              })} />
            <span className="slider-value">{profile.seat_position[key]}</span>
          </div>
        ))}
      </div>

      {/* Speed Limit */}
      <div className="control-card">
        <div className="card-header">
          <h3>🏎️ Speed Limit</h3>
          <label className="auto-toggle">
            <input type="checkbox" checked={profile.auto_speed_limit}
              onChange={(e) => updateProfile({ auto_speed_limit: e.target.checked })} />
            Auto
          </label>
        </div>
        {profile.speed_limit !== null && (
          <div className="slider-group">
            <input type="range" min="20" max="200"
              value={profile.speed_limit || 120}
              disabled={profile.auto_speed_limit}
              onChange={(e) => updateProfile({ speed_limit: Number(e.target.value) })} />
            <span className="slider-value">{profile.speed_limit || 120} km/h</span>
          </div>
        )}
        {profile.speed_limit === null && (
          <p className="info-text">No speed limit enforced (non-learner driver)</p>
        )}
      </div>

      {/* Ambient Lighting */}
      <div className="control-card">
        <div className="card-header">
          <h3>💡 Ambient Lighting</h3>
          <label className="auto-toggle">
            <input type="checkbox" checked={profile.auto_lighting}
              onChange={(e) => updateProfile({ auto_lighting: e.target.checked })} />
            Auto
          </label>
        </div>
        <div className="color-picker-group">
          <input type="color" value={profile.ambient_lighting}
            disabled={profile.auto_lighting}
            onChange={(e) => updateProfile({ ambient_lighting: e.target.value })} />
          <span>{profile.ambient_lighting}</span>
        </div>
      </div>

      {/* Mirror Positions */}
      <div className="control-card">
        <div className="card-header">
          <h3>🪞 Mirror Positions</h3>
          <label className="auto-toggle">
            <input type="checkbox" checked={profile.auto_mirror}
              onChange={(e) => updateProfile({ auto_mirror: e.target.checked })} />
            Auto
          </label>
        </div>
        {['left', 'right'].map((side) => (
          <div key={side} className="mirror-control">
            <h4>{side.charAt(0).toUpperCase() + side.slice(1)} Mirror</h4>
            {['x', 'y'].map((axis) => (
              <div className="slider-group" key={`${side}-${axis}`}>
                <label>{axis.toUpperCase()}</label>
                <input type="range" min="0" max="100"
                  value={profile.mirror_positions[side][axis]}
                  disabled={profile.auto_mirror}
                  onChange={(e) => {
                    const updated = { ...profile.mirror_positions }
                    updated[side] = { ...updated[side], [axis]: Number(e.target.value) }
                    updateProfile({ mirror_positions: updated })
                  }} />
                <span className="slider-value">{profile.mirror_positions[side][axis]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Steering Sensitivity */}
      <div className="control-card">
        <div className="card-header">
          <h3>🎯 Steering Sensitivity</h3>
        </div>
        <div className="slider-group">
          <input type="range" min="0" max="100"
            value={profile.steering_sensitivity}
            onChange={(e) => updateProfile({ steering_sensitivity: Number(e.target.value) })} />
          <span className="slider-value">{profile.steering_sensitivity}%</span>
        </div>
      </div>

      {/* Actions */}
      <div className="control-card actions-card">
        <h3>⚙️ Actions</h3>
        <div className="action-buttons">
          <button onClick={logManualInteraction} className="btn-secondary">
            Save Current Settings as Preference
          </button>
          <button onClick={trainNow} className="btn-primary"
            disabled={trainStatus === 'training'}>
            {trainStatus === 'training' ? '🔄 Training...' : '🧠 Train Model Now'}
          </button>
        </div>
        {trainStatus && trainStatus !== 'training' && (
          <div className="train-status">{trainStatus}</div>
        )}
        <small className="info-text">
          Model automatically retrains every 12 hours. Save your preferences multiple times to give the AI enough data.
        </small>
      </div>
    </div>
  )
}
