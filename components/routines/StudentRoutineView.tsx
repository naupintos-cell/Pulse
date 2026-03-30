// components/routines/StudentRoutineView.tsx

import type { DiaConBloques, Bloque, Ejercicio } from '@/types/routines'
import { TIPO_BLOQUE_CONFIG } from '@/types/routines'
import { BlockTypeBadge } from './BlockTypeBadge'

// ── Fila de ejercicio ────────────────────────────────────
function EjercicioFila({ ej }: { ej: Ejercicio }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
      <div>
        <span className="text-slate-200 text-sm font-medium">
          {ej.nombre ?? 'Ejercicio'}
        </span>
        {ej.observaciones && (
          <p className="text-slate-500 text-xs mt-0.5">{ej.observaciones}</p>
        )}
      </div>
      <div className="text-right shrink-0 ml-3">
        {(ej.series || ej.repeticiones) && (
          <span className="text-white font-bold text-sm">
            {ej.series ? `${ej.series}×` : ''}{ej.repeticiones}
          </span>
        )}
        {ej.carga && (
          <p className="text-slate-400 text-xs">{ej.carga}</p>
        )}
        {ej.descanso && (
          <p className="text-slate-500 text-xs">{ej.descanso}″ desc.</p>
        )}
      </div>
    </div>
  )
}

// ── Card de bloque ───────────────────────────────────────
function BloqueCard({ bloque }: { bloque: Bloque }) {
  const config = TIPO_BLOQUE_CONFIG[bloque.tipo]
  const isCircuito = bloque.tipo === 'circuito' || bloque.tipo === 'superserie'
  const ejercicios = bloque.ejercicios ?? []

  return (
    <div className={`rounded-xl border overflow-hidden ${config.bgColor}`}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <BlockTypeBadge tipo={bloque.tipo} size="md" />
          <span className="font-bold text-white text-sm truncate">
            {bloque.nombre}
          </span>
        </div>
        {isCircuito && bloque.rondas && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="text-lg">🔁</span>
            <span className="text-white font-bold text-sm">{bloque.rondas}</span>
          </div>
        )}
      </div>

      {/* Descripción */}
      {bloque.descripcion && (
        <div className="px-4 py-2 bg-slate-900/30">
          <p className="text-slate-400 text-xs italic">{bloque.descripcion}</p>
        </div>
      )}

      {/* Ejercicios */}
      <div className="px-4 py-1">
        {ejercicios.map((ej) => (
          <EjercicioFila key={ej.id} ej={ej} />
        ))}
      </div>

      {/* Footer circuito */}
      {isCircuito && bloque.descanso_entre_rondas && (
        <div className="px-4 py-2 bg-slate-900/40 flex items-center gap-2">
          <span className="text-slate-400 text-xs">⏱ Descanso entre rondas:</span>
          <span className="text-white text-xs font-semibold">
            {bloque.descanso_entre_rondas} seg
          </span>
        </div>
      )}

    </div>
  )
}

// ── Vista legacy (rutinas sin bloques) ───────────────────
function VistaLegacy({ ejercicios }: { ejercicios: Ejercicio[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="px-4 py-1">
        {ejercicios.map((ej) => (
          <EjercicioFila key={ej.id} ej={ej} />
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────
export function StudentRoutineView({ dia }: { dia: DiaConBloques }) {
  return (
    <div className="space-y-4">

      {/* Header del día */}
      <div className="flex items-center gap-3 pb-1">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800
          flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg">
          {dia.numero}
        </div>
        <div>
          <h2 className="font-black text-white text-lg leading-tight">
            {dia.nombre || `Día ${dia.numero}`}
          </h2>
          <p className="text-slate-500 text-xs">
            {dia.tiene_bloques
              ? `${dia.bloques.length} bloque${dia.bloques.length !== 1 ? 's' : ''}`
              : `${dia.ejercicios_legacy.length} ejercicio${dia.ejercicios_legacy.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
      </div>

      {/* Bloques o legacy */}
      {dia.tiene_bloques ? (
        <div className="space-y-3">
          {dia.bloques.map((bloque) => (
            <BloqueCard key={bloque.id} bloque={bloque} />
          ))}
        </div>
      ) : (
        <VistaLegacy ejercicios={dia.ejercicios_legacy} />
      )}

    </div>
  )
}
