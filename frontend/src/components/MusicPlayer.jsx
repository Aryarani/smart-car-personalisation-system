import React, { useState, useEffect, useRef, useCallback } from 'react'

const DEEZER_PROXY = '/api/music/search'

export default function MusicPlayer({ genre, autoPlay }) {
  const [tracks, setTracks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  const audioRef = useRef(null)
  const intervalRef = useRef(null)

  const fetchTracks = useCallback(async (searchGenre) => {
    setLoading(true)
    setError(null)
    try {
      const query = encodeURIComponent(searchGenre)
      const url = `${DEEZER_PROXY}?q=${query}&limit=20`
      const res = await fetch(url)
      const data = await res.json()
      if (data.data && data.data.length > 0) {
        const withPreviews = data.data.filter((t) => t.preview)
        setTracks(withPreviews)
        setCurrentIndex(0)
        setProgress(0)
      } else {
        setError('No tracks found')
        setTracks([])
      }
    } catch (err) {
      console.error('Deezer fetch error:', err)
      setError('Could not load music')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch new tracks when genre changes
  useEffect(() => {
    if (genre) fetchTracks(genre)
  }, [genre, fetchTracks])

  // Auto-play when tracks load and autoPlay is on
  useEffect(() => {
    if (autoPlay && tracks.length > 0 && audioRef.current) {
      audioRef.current.src = tracks[0].preview
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [tracks, autoPlay])

  // Progress tracking
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100
          setProgress(isNaN(pct) ? 0 : pct)
        }
      }, 200)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing])

  const playTrack = (index) => {
    if (!tracks[index]?.preview) return
    setCurrentIndex(index)
    setProgress(0)
    if (audioRef.current) {
      audioRef.current.src = tracks[index].preview
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      if (!audioRef.current.src && tracks.length > 0) {
        audioRef.current.src = tracks[currentIndex].preview
      }
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  const nextTrack = () => {
    const next = (currentIndex + 1) % tracks.length
    playTrack(next)
  }

  const prevTrack = () => {
    const prev = (currentIndex - 1 + tracks.length) % tracks.length
    playTrack(prev)
  }

  const handleEnded = () => {
    setPlaying(false)
    setProgress(0)
    nextTrack()
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      fetchTracks(searchQuery.trim())
    }
  }

  const current = tracks[currentIndex]

  return (
    <div className="music-player">
      <audio ref={audioRef} onEnded={handleEnded} />

      {/* Search bar */}
      <div className="mp-search-section">
        <button
          type="button"
          className={`mp-search-toggle ${searchMode ? 'active' : ''}`}
          onClick={() => setSearchMode(!searchMode)}
        >
          🔍 Search
        </button>
        {searchMode && (
          <form onSubmit={handleSearch} className="mp-search-form">
            <input
              type="text"
              placeholder="Search songs, artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mp-search-input"
            />
            <button type="submit" className="mp-search-btn">Go</button>
          </form>
        )}
      </div>

      {loading && <div className="mp-loading">Loading {genre} tracks...</div>}
      {error && <div className="mp-error">{error}</div>}

      {current && !loading && (
        <>
          {/* Now Playing */}
          <div className="mp-now-playing">
            <img
              src={current.album?.cover_medium || current.album?.cover}
              alt={current.title}
              className="mp-album-art"
            />
            <div className="mp-track-info">
              <div className="mp-title">{current.title_short || current.title}</div>
              <div className="mp-artist">{current.artist?.name}</div>
              <div className="mp-album">{current.album?.title}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mp-progress-bar">
            <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Controls */}
          <div className="mp-controls">
            <button onClick={prevTrack} className="mp-btn" aria-label="Previous track">⏮</button>
            <button onClick={togglePlay} className="mp-btn mp-btn-play" aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={nextTrack} className="mp-btn" aria-label="Next track">⏭</button>
          </div>

          {/* Track list */}
          <div className="mp-tracklist">
            {tracks.slice(0, 8).map((t, i) => (
              <div
                key={t.id}
                className={`mp-track-item ${i === currentIndex ? 'active' : ''}`}
                onClick={() => playTrack(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && playTrack(i)}
              >
                <img src={t.album?.cover_small} alt="" className="mp-track-thumb" />
                <div className="mp-track-item-info">
                  <span className="mp-track-item-title">{t.title_short || t.title}</span>
                  <span className="mp-track-item-artist">{t.artist?.name}</span>
                </div>
                {i === currentIndex && playing && <span className="mp-eq">♪</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
