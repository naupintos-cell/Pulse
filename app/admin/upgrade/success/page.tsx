// @ts-nocheck
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UpgradeSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => router.push('/admin'), 4000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        @keyframes pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }

        .s-root {
          min-height: 100vh;
          background: #F5F2EE;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
        }
        .s-card {
          background: white;
          border-radius: 24px;
          padding: 48px 40px;
          text-align: center;
          max-width: 420px;
          width: 100%;
          border: 1px solid #E6E0DA;
          box-shadow: 0 8px 32px rgba(0,0,0,.06);
          animation: slideUp .5s cubic-bezier(.22,.68,0,1.2) both;
          position: relative;
          overflow: hidden;
        }
        .s-card::before {
          content: '';
          position: absolute;
          top: 0; left: 36px; right: 36px;
          height: 2.5px;
          background: linear-gradient(90deg, #5B8CFF, #4A74D9);
          border-radius: 0 0 6px 6px;
        }
        .s-icon { font-size: 56px; margin-bottom: 20px; animation: pop .5s .2s cubic-bezier(.22,.68,0,1.2) both; display: block; }
        .s-badge { display: inline-block; background: #5B8CFF; color: white; font-size: 11px; font-weight: 600; padding: 3px 14px; border-radius: 20px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px; }
        .s-title { font-family: 'Fraunces', Georgia, serif; font-size: 28px; font-weight: 900; color: #1C1714; margin-bottom: 10px; }
        .s-sub { font-size: 15px; color: #9E9188; line-height: 1.6; margin-bottom: 28px; }
        .s-features { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; text-align: left; }
        .s-feature { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #3C3430; }
        .s-check { width: 20px; height: 20px; border-radius: 50%; background: #5B8CFF; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: 700; flex-shrink: 0; }
        .s-bar { width: 100%; height: 3px; background: #F0EBE5; border-radius: 2px; overflow: hidden; }
        .s-progress { height: 100%; background: linear-gradient(90deg, #5B8CFF, #4A74D9); border-radius: 2px; animation: progress 4s linear forwards; }
        .s-redirect { font-size: 12px; color: #BDB5AD; margin-top: 8px; }
      `}</style>

      <div className="s-root">
        <div className="s-card">
          <span className="s-icon">🎉</span>
          <div className="s-badge">Plan PRO activado</div>
          <div className="s-title">¡Bienvenida a Pulse PRO!</div>
          <div className="s-sub">Tu cuenta fue activada exitosamente. Ahora tenés acceso completo a todas las funcionalidades.</div>

          <div className="s-features">
            {[
              'Alumnos ilimitados',
              'Branding 100% tuyo',
              'Gestión de pagos',
              'Soporte prioritario',
            ].map(f => (
              <div key={f} className="s-feature">
                <div className="s-check">✓</div>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="s-bar"><div className="s-progress" /></div>
          <div className="s-redirect">Redirigiendo al dashboard...</div>
        </div>
      </div>
    </>
  )
}
