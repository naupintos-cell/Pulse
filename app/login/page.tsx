// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next')

  const supabase = createClient()

  const [mode, setMode] = useState<'alumno' | 'admin'>('alumno')
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [brandImageUrl, setBrandImageUrl] = useState<string | null>(null)
  const [brandName, setBrandName] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#5B8CFF')
  const [secondaryColor, setSecondaryColor] = useState('#4A74D9')
  const [dniError, setDniError] = useState(false)
  const [passError, setPassError] = useState(false)

  // Si viene con ?next= es flujo PRO — mostrar tab profesora por defecto
  useEffect(() => {
    if (nextUrl) setMode('admin')
  }, [nextUrl])

  // ✅ SEGURO: Usa Edge Function en lugar de query directa a la tabla
  useEffect(() => {
    async function loadBrand() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-brand`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          }
        )
        if (!res.ok) return
        const data = await res.json()

        if (data?.brand_image_url) setBrandImageUrl(data.brand_image_url)
        if (data?.brand_name) setBrandName(data.brand_name)
        if (data?.primary_color) setPrimaryColor(data.primary_color)
        if (data?.secondary_color) setSecondaryColor(data.secondary_color)
        // Si es FREE, fuerza colores Pulse
        if (data?.plan !== 'pro') {
          setPrimaryColor('#5B8CFF')
          setSecondaryColor('#4A74D9')
          setBrandImageUrl(null)
          setBrandName(null)
        }
      } catch {}
    }
    loadBrand()
  }, [])

  function getContrastText(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#1a1a1a' : '#ffffff'
  }

  const ctaTextColor = getContrastText(primaryColor)

  // ✅ SEGURO: Usa Edge Function para buscar email por DNI
  async function handleLogin() {
    setError('')
    setDniError(false)
    setPassError(false)

    if (!dni || !password) {
      if (!dni) setDniError(true)
      if (!password) setPassError(true)
      setError('Completá DNI y contraseña')
      return
    }

    setLoading(true)
    try {
      // 1. Buscar email por DNI via Edge Function (no expone la tabla)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/login-by-dni`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ dni })
        }
      )

      const perfil = await res.json()

      if (!res.ok || !perfil?.email) {
        setDniError(true)
        setError('No existe una cuenta con ese DNI')
        setLoading(false)
        return
      }

      // 2. Autenticar con email + password via Supabase Auth (seguro por diseño)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: perfil.email,
        password,
      })

      if (authError) {
        setPassError(true)
        setError('Contraseña incorrecta')
        setLoading(false)
        return
      }

      // 3. Redirigir según ?next= o rol
      if (nextUrl) {
        router.push(nextUrl)
      } else if (perfil.rol === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }

    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .l-root {
          min-height: 100vh;
          background: #F5F2EE;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .l-root::before {
          content: '';
          position: fixed;
          top: -180px; right: -180px;
          width: 520px; height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, ${primaryColor}14 0%, transparent 70%);
          pointer-events: none;
        }
        .l-root::after {
          content: '';
          position: fixed;
          bottom: -180px; left: -180px;
          width: 440px; height: 440px;
          border-radius: 50%;
          background: radial-gradient(circle, ${secondaryColor}0e 0%, transparent 70%);
          pointer-events: none;
        }
        .l-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 48px 40px 40px;
          width: 100%;
          max-width: 410px;
          border: 1px solid #E6E0DA;
          box-shadow: 0 2px 4px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06), 0 24px 48px rgba(0,0,0,.04);
          position: relative;
          z-index: 1;
          animation: slideUp .45s cubic-bezier(.22,.68,0,1.2) both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .l-card::before {
          content: '';
          position: absolute;
          top: 0; left: 36px; right: 36px;
          height: 2.5px;
          background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor});
          border-radius: 0 0 6px 6px;
        }
        @media (max-width: 480px) {
          .l-card { padding: 36px 24px 32px; border-radius: 20px; }
        }
        .l-brand { text-align: center; margin-bottom: 36px; }
        .l-logo {
          width: 76px; height: 76px; border-radius: 20px; overflow: hidden;
          margin: 0 auto 14px; border: 1.5px solid #E6E0DA;
          box-shadow: 0 2px 8px rgba(0,0,0,.08), 0 0 0 4px ${primaryColor}10;
          display: flex; align-items: center; justify-content: center;
          background: ${primaryColor}12; transition: box-shadow .2s;
        }
        .l-logo:hover { box-shadow: 0 4px 16px rgba(0,0,0,.12), 0 0 0 6px ${primaryColor}14; }
        .l-logo img { width: 100%; height: 100%; object-fit: cover; }
        .l-logo-emoji { font-size: 32px; line-height: 1; }
        .l-brand-name { font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 900; color: #1C1714; letter-spacing: -0.4px; margin-bottom: 5px; }
        .l-brand-claim { font-size: 13.5px; color: #9E9188; font-weight: 400; }

        .l-next-banner {
          background: #EEF4FF;
          border: 1px solid #C7D9FF;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #3B5BDB;
          text-align: center;
          font-weight: 500;
        }

        .l-toggle {
          display: flex; background: #F0EBE5; border-radius: 14px;
          padding: 4px; gap: 4px; margin-bottom: 28px; border: 1px solid #E0D8D0;
        }
        .l-toggle-btn {
          flex: 1; padding: 10px 12px; border: none; border-radius: 10px;
          font-weight: 500; font-size: 13.5px; cursor: pointer;
          transition: all .2s cubic-bezier(.22,.68,0,1.1);
          font-family: 'DM Sans', sans-serif; outline: none;
        }
        .l-toggle-btn.active {
          background: ${primaryColor}; color: ${ctaTextColor};
          box-shadow: 0 1px 3px rgba(0,0,0,.15), 0 4px 12px ${primaryColor}45;
          transform: translateY(-0.5px);
        }
        .l-toggle-btn.inactive { background: transparent; color: #7A7068; }
        .l-toggle-btn.inactive:hover { background: #E8E2DA; color: #3C3430; }

        .l-field { margin-bottom: 16px; }
        .l-label { display: block; font-size: 11.5px; font-weight: 600; color: #6B6259; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 7px; }
        .l-input {
          width: 100%; background: #FFFFFF; border: 1.5px solid #D8D0C8;
          border-radius: 12px; padding: 13px 16px; font-size: 15px;
          font-family: 'DM Sans', sans-serif; color: #1C1714; outline: none;
          transition: border-color .15s, box-shadow .15s; -webkit-appearance: none;
        }
        .l-input::placeholder { color: #BDB5AD; font-weight: 300; }
        .l-input:focus { border-color: ${primaryColor}; box-shadow: 0 0 0 3.5px ${primaryColor}1C; }
        .l-input.has-error { border-color: #E53E3E; box-shadow: 0 0 0 3px rgba(229,62,62,.12); }

        .l-error {
          background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 10px;
          padding: 11px 14px; margin-bottom: 16px; color: #C53030; font-size: 13.5px;
          font-weight: 500; display: flex; align-items: center; gap: 8px;
          animation: shake .35s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .l-cta {
          width: 100%; background: ${primaryColor}; color: ${ctaTextColor};
          border: none; border-radius: 13px; padding: 15px; font-size: 15px;
          font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: opacity .15s, transform .12s, box-shadow .15s;
          margin-top: 4px; box-shadow: 0 2px 8px ${primaryColor}35;
        }
        .l-cta:hover:not(:disabled) { opacity: .92; transform: translateY(-1px); box-shadow: 0 4px 16px ${primaryColor}45; }
        .l-cta:disabled { opacity: .62; cursor: not-allowed; }
        .l-cta.loading { display: flex; align-items: center; justify-content: center; gap: 10px; }
        .l-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid ${ctaTextColor}40; border-top-color: ${ctaTextColor};
          border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .l-register { text-align: center; margin-top: 20px; }
        .l-register a {
          color: ${primaryColor}; font-size: 13.5px; font-weight: 500;
          text-decoration: none; border-bottom: 1px solid ${primaryColor}30;
          padding-bottom: 1px; transition: border-color .15s, opacity .15s;
        }
        .l-register a:hover { border-color: ${primaryColor}; opacity: .85; }
      `}</style>

      <div className="l-root">
        <div className="l-card">

          <div className="l-brand">
            <div className="l-logo">
              {brandImageUrl
                ? <img src={brandImageUrl} alt={brandName || 'Logo'} />
                : <svg width="36" height="36" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#5B8CFF"/><text x="16" y="22" textAnchor="middle" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="#fff">P</text></svg>
              }
            </div>
            {brandName && <div className="l-brand-name">{brandName}</div>}
            <div className="l-brand-claim">Tu entrenamiento personalizado</div>
          </div>

          {/* Banner cuando viene del flujo PRO */}
          {nextUrl && (
            <div className="l-next-banner">
              🎉 Ingresá para activar tu plan PRO
            </div>
          )}

          <div className="l-toggle">
            {(['alumno', 'admin'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setDniError(false); setPassError(false) }}
                className={`l-toggle-btn ${mode === m ? 'active' : 'inactive'}`}
              >
                {m === 'alumno' ? '⚡ Atleta' : '🎯 Trainer'}
              </button>
            ))}
          </div>

          <div className="l-field">
            <label className="l-label">DNI</label>
            <input
              className={`l-input${dniError ? ' has-error' : ''}`}
              type="text"
              placeholder="Sin puntos ni guiones"
              maxLength={mode === 'admin' ? 12 : 8}
              value={dni}
              onChange={e => { setDni(e.target.value.replace(/\D/g, '')); setDniError(false); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="l-field">
            <label className="l-label">Contraseña</label>
            <input
              className={`l-input${passError ? ' has-error' : ''}`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setPassError(false); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div className="l-error">
              <span style={{ fontSize: 16 }}>⚠️</span> {error}
            </div>
          )}

          <button
            className={`l-cta${loading ? ' loading' : ''}`}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading
              ? <><div className="l-spinner" /> Ingresando...</>
              : 'Ingresar →'
            }
          </button>

          {mode === 'alumno' && (
            <div className="l-register">
              <Link href="/register">¿No tenés cuenta? Registrate →</Link>
            </div>
          )}

          {mode === 'admin' && (
            <div className="l-register">
              <Link href="/register/admin">¿No tenés cuenta? Registrate →</Link>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E0D8D0', borderTopColor: '#5B8CFF', borderRadius: '50%' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
