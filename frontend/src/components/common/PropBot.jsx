import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { propertyApi } from '../../api/services'
import { getAiReply } from '../../api/aiService'

const WELCOME = {
  from: 'bot',
  text: "Hi! I'm PropBot, your AI property assistant 🏠\n\nAsk me anything — find properties, check prices, or learn how our AI features work."
}

export default function PropBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState([])
  const bottomRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('propbot:open', handler)
    return () => window.removeEventListener('propbot:open', handler)
  }, [])

  // Pre-load properties for context-aware responses
  useEffect(() => {
    propertyApi.getAll({ availableOnly: true, pageSize: 20 })
      .then(res => setProperties(res.data.items || []))
      .catch(() => {})
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { from: 'user', text }])
    setLoading(true)
    try {
      const reply = await getAiReply(text, { properties })
      setMessages(prev => [...prev, { from: 'bot', ...reply }])
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, I had trouble responding. Please try again.' }])
    }
    setLoading(false)
  }

  const handleNav = path => { setOpen(false); navigate(path) }

  return (
    <>
      <button className="propbot-fab" onClick={() => setOpen(o => !o)} title="PropBot Assistant">
        {open ? '✕' : '🤖 PropBot'}
      </button>

      {open && (
        <div className="propbot-window">
          <div className="propbot-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>PropBot AI</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>● Online — AI Property Assistant</div>
            </div>
            <button className="propbot-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="propbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`propbot-msg propbot-msg--${m.from}`}>
                <div className="propbot-bubble">{m.text}</div>
                {m.action && (
                  <button className="propbot-action-btn" onClick={() => handleNav(m.action.path)}>
                    {m.action.label}
                  </button>
                )}
                {m.actions && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {m.actions.map(a => (
                      <button key={a.path} className="propbot-action-btn" onClick={() => handleNav(a.path)}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="propbot-msg propbot-msg--bot">
                <div className="propbot-bubble propbot-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="propbot-input-row">
            <input
              className="propbot-input"
              placeholder="Ask about properties…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button className="propbot-send" onClick={send} disabled={loading}>Send</button>
          </div>
        </div>
      )}
    </>
  )
}
