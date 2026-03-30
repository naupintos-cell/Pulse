// @ts-nocheck
// components/SoporteChat.tsx
'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  userType: 'admin' | 'alumno'
  userName?: string
  primaryColor?: string
}

export function SoporteChat({ userType, userName, primaryColor = '#5B8CFF' }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: userType === 'admin'
        ? `¡Hola${userName ? `, ${userName}` : ''}! 👋 Soy el asistente de Pulse. Puedo ayudarte con la gestión de alumnos, planes de entrenamiento, cobros y configuración de tu cuenta. ¿En qué te puedo ayudar?`
        : `¡Hola${userName ? `, ${userName}` : ''}! 👋 Soy el asistente de Pulse. Puedo ayudarte a entender tu plan de entrenamiento, cómo registrar tus ejercicios y usar la app. ¿Qué necesitás?`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/soporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          userType,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Hubo un error al procesar tu consulta. Por favor intentá de nuevo o escribinos a hola@getpulseapp.lat'
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const isEscalado = (text: string) =>
    text.toLowerCase().includes('hola@getpulseapp.lat')

  async function sendDirect(text: string) {
    if (loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/soporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, userType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error. Intentá de nuevo o escribinos a hola@getpulseapp.lat' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, alignSelf: 'flex-end' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill={primaryColor}/>
                  <text x="8" y="12" textAnchor="middle" fontFamily="Georgia,serif" fontSize="10" fontWeight="700" fill="#000">P</text>
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: '75%',
              background: msg.role === 'user' ? primaryColor : '#f9fafb',
              color: msg.role === 'user' ? '#fff' : '#111827',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: '1.5',
              border: msg.role === 'assistant' ? '1px solid #f3f4f6' : 'none',
            }}>
              {msg.content}
              {isEscalado(msg.content) && (
                <div style={{ marginTop: '10px' }}>
                  <a
                    href="mailto:hola@getpulseapp.lat"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: primaryColor, border: `1px solid ${primaryColor}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                    ✉️ Escribir a soporte
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill={primaryColor}/><text x="8" y="12" textAnchor="middle" fontFamily="Georgia,serif" fontSize="10" fontWeight="700" fill="#000">P</text></svg>
            </div>
            <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#d1d5db', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies — solo al inicio */}
      {messages.length === 1 && (
        <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(userType === 'admin' ? [
            '¿Cómo creo un alumno?',
            '¿Cómo armo un plan?',
            '¿Cómo activo los cobros?',
            '¿Cómo cambio mi logo?',
          ] : [
            '¿Cómo veo mi rutina?',
            '¿Cómo registro una serie?',
            '¿Cómo pago mi cuota?',
            '¿Qué es RPE?',
          ]).map(q => (
            <button key={q} onClick={() => sendDirect(q)}
              style={{ background: '#fff', border: `1px solid ${primaryColor}30`, borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: '500', color: primaryColor, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = `${primaryColor}10`)}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Escribí tu consulta..."
          disabled={loading}
          style={{ flex: 1, background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '11px 14px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: '#111827', outline: 'none', transition: 'border-color .15s' }}
          onFocus={e => (e.target.style.borderColor = primaryColor)}
          onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ width: 44, height: 44, borderRadius: '12px', background: primaryColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1, transition: 'opacity .15s' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 9h14M9 2l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
