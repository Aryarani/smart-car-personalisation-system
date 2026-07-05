import React, { useState, useEffect, useRef } from 'react'

const BOOT_STEPS = [
  { text: 'INITIALIZING VEHICLE SYSTEMS', duration: 600 },
  { text: 'AUTHENTICATING DRIVER', duration: 500 },
  { text: 'LOADING DRIVER PROFILE', duration: 500 },
  { text: 'CALIBRATING SEAT & MIRRORS', duration: 400 },
  { text: 'SYNCING CLIMATE CONTROL', duration: 400 },
  { text: 'CONNECTING ENTERTAINMENT', duration: 400 },
  { text: 'AI ENGINE ONLINE', duration: 500 },
  { text: 'ALL SYSTEMS READY', duration: 600 },
]

// ---- Web Audio API: Robotic sound effects ----
function createAudioCtx() {
  return new (window.AudioContext || window.webkitAudioContext)()
}

function playBootBeep(ctx, freq = 880, duration = 0.12) {
  const t = ctx.currentTime
  // Hard square wave with bitcrusher-style staircase pitch
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  // Staircase frequency jumps (robotic stutter)
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.setValueAtTime(freq * 1.5, t + duration * 0.25)
  osc.frequency.setValueAtTime(freq * 0.7, t + duration * 0.5)
  osc.frequency.setValueAtTime(freq * 1.2, t + duration * 0.75)
  gain.gain.setValueAtTime(0.09, t)
  // Abrupt cut (no fade — robotic)
  gain.gain.setValueAtTime(0.09, t + duration - 0.01)
  gain.gain.linearRampToValueAtTime(0, t + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration)
}

function playPowerOn(ctx) {
  const t = ctx.currentTime

  // Robotic servo startup: stepped frequency climb
  const steps = 12
  for (let i = 0; i < steps; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    const f = 60 + i * 40
    const start = t + i * 0.07
    osc.frequency.setValueAtTime(f, start)
    gain.gain.setValueAtTime(0.06, start)
    gain.gain.setValueAtTime(0, start + 0.05)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.06)
  }

  // Metallic ring after steps
  const ring = ctx.createOscillator()
  const ringGain = ctx.createGain()
  const ringFilter = ctx.createBiquadFilter()
  ring.type = 'sawtooth'
  ring.frequency.setValueAtTime(500, t + 0.85)
  ringFilter.type = 'bandpass'
  ringFilter.frequency.setValueAtTime(1200, t + 0.85)
  ringFilter.Q.setValueAtTime(15, t + 0.85)
  ringGain.gain.setValueAtTime(0.08, t + 0.85)
  ringGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
  ring.connect(ringFilter)
  ringFilter.connect(ringGain)
  ringGain.connect(ctx.destination)
  ring.start(t + 0.85)
  ring.stop(t + 1.4)
}

function playReadyChime(ctx) {
  const t = ctx.currentTime
  // Robot confirmation: two hard square tones (like R2-D2 affirmative)
  const tones = [
    { freq: 800, start: 0, dur: 0.15 },
    { freq: 600, start: 0.12, dur: 0.1 },
    { freq: 1000, start: 0.22, dur: 0.2 },
    { freq: 1200, start: 0.35, dur: 0.25 },
  ]
  tones.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, t + start)
    gain.gain.setValueAtTime(0.1, t + start)
    gain.gain.setValueAtTime(0.1, t + start + dur - 0.01)
    gain.gain.linearRampToValueAtTime(0, t + start + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t + start)
    osc.stop(t + start + dur)
  })
}

function playHumLoop(ctx) {
  // Robotic idle hum: low square wave with rhythmic pulse
  const t = ctx.currentTime
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  const gain = ctx.createGain()

  osc1.type = 'square'
  osc1.frequency.setValueAtTime(50, t)
  osc2.type = 'square'
  osc2.frequency.setValueAtTime(75, t)

  // Rhythmic pulsing (robotic breathing)
  lfo.type = 'square'
  lfo.frequency.setValueAtTime(3, t)
  lfoGain.gain.setValueAtTime(0.015, t)
  lfo.connect(lfoGain)
  lfoGain.connect(gain.gain)

  gain.gain.setValueAtTime(0.02, t)

  osc1.connect(gain)
  osc2.connect(gain)
  gain.connect(ctx.destination)
  osc1.start()
  osc2.start()
  lfo.start()
  return { oscs: [osc1, osc2, lfo], gain }
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  return { osc, gain }
}

function speakWelcome(username) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const msg = new SpeechSynthesisUtterance(
    `Welcome back, ${username}. All systems are online. Your personalized driving experience is ready.`
  )
  msg.rate = 1.1
  msg.pitch = 0.3
  msg.volume = 1
  // Pick a robotic-sounding voice if available
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.includes('Alex') || v.name.includes('Daniel') || v.name.includes('Google UK English Male'))
  ) || voices.find((v) => v.lang.startsWith('en'))
  if (preferred) msg.voice = preferred
  window.speechSynthesis.speak(msg)
}

export default function BootSequence({ username, onComplete }) {
  const [step, setStep] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const audioCtxRef = useRef(null)
  const humRef = useRef(null)

  // Initialize audio context and play power-on sound
  useEffect(() => {
    const ctx = createAudioCtx()
    audioCtxRef.current = ctx

    // Ensure voices are loaded for speech synthesis
    window.speechSynthesis?.getVoices()

    // Power-on sweep
    playPowerOn(ctx)
    // Start ambient hum
    humRef.current = playHumLoop(ctx)

    const startTimer = setTimeout(() => setStep(0), 400)
    return () => {
      clearTimeout(startTimer)
      if (humRef.current) {
        const ct = ctx.currentTime
        humRef.current.gain.gain.exponentialRampToValueAtTime(0.001, ct + 0.3)
        humRef.current.oscs.forEach((o) => o.stop(ct + 0.3))
      }
    }
  }, [])

  useEffect(() => {
    if (step < 0 || step >= BOOT_STEPS.length) return
    const ctx = audioCtxRef.current

    // Beep for each step — pitch rises as boot progresses
    if (ctx) {
      const freq = 400 + step * 80
      playBootBeep(ctx, freq, 0.08, 0.1)
    }

    const targetProgress = ((step + 1) / BOOT_STEPS.length) * 100
    const progressTimer = setTimeout(() => setProgress(targetProgress), 100)

    const nextTimer = setTimeout(() => {
      if (step < BOOT_STEPS.length - 1) {
        setStep(step + 1)
      } else {
        // Boot complete
        if (ctx) playReadyChime(ctx)
        // Fade out hum
        if (humRef.current && ctx) {
          humRef.current.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
          humRef.current.oscs.forEach((o) => o.stop(ctx.currentTime + 0.5))
        }
        setTimeout(() => {
          setShowWelcome(true)
          speakWelcome(username)
        }, 300)
        setTimeout(() => setFadeOut(true), 3200)
        setTimeout(() => onComplete(), 3800)
      }
    }, BOOT_STEPS[step].duration)

    return () => {
      clearTimeout(progressTimer)
      clearTimeout(nextTimer)
    }
  }, [step, onComplete, username])

  return (
    <div className={`boot-screen ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated ring */}
      <div className="boot-ring-container">
        <svg className="boot-ring" viewBox="0 0 200 200">
          <circle className="boot-ring-bg" cx="100" cy="100" r="90"
            fill="none" stroke="rgba(74,144,217,0.1)" strokeWidth="2" />
          <circle className="boot-ring-progress" cx="100" cy="100" r="90"
            fill="none" stroke="url(#bootGradient)" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${progress * 5.65} 565`}
            transform="rotate(-90 100 100)" />
          <defs>
            <linearGradient id="bootGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a90d9" />
              <stop offset="100%" stopColor="#00d4aa" />
            </linearGradient>
          </defs>
        </svg>
        <div className="boot-ring-inner">
          {!showWelcome ? (
            <div className="boot-percentage">{Math.round(progress)}%</div>
          ) : (
            <div className="boot-car-icon">🚗</div>
          )}
        </div>
      </div>

      {/* Welcome message */}
      {showWelcome && (
        <div className="boot-welcome">
          <h1>Welcome back</h1>
          <h2>{username}</h2>
          <p>Your personalized experience is ready</p>
        </div>
      )}

      {/* Boot log */}
      {!showWelcome && (
        <div className="boot-log">
          {BOOT_STEPS.slice(0, step + 1).map((s, i) => (
            <div key={i} className={`boot-log-line ${i === step ? 'current' : 'done'}`}>
              <span className="boot-log-icon">{i < step ? '✓' : '▸'}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!showWelcome && (
        <div className="boot-progress-bar">
          <div className="boot-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Scanline effect */}
      <div className="boot-scanline" />
      <div className="boot-vignette" />
    </div>
  )
}
