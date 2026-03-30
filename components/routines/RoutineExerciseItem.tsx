// components/routines/RoutineExerciseItem.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import type { Ejercicio } from '@/types/routines'

interface Props {
  ejercicio: Ejercicio
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onUpdate: (data: Partial<Ejercicio>) => void
  // Drag & drop
  onDragStart?: (index: number) => void
  onDragEnter?: (index: number) => void
  onDragEnd?: () => void
  isDragging?: boolean
  isDragOver?: boolean
}

export function RoutineExerciseItem({
  ejercicio, index, total, onMoveUp, onMoveDown, onDelete, onUpdate,
  onDragStart, onDragEnter, onDragEnd, isDragging, isDragOver
}: Props) {
  const isNuevo = ejercicio.nombre === 'Nuevo ejercicio' || !ejercicio.nombre
  const [editing, setEditing] = useState(isNuevo)
  const [nombre, setNombre] = useState(isNuevo ? '' : (ejercicio.nombre ?? ''))
  const [series, setSeries] = useState(String(ejercicio.series ?? ''))
  const [reps, setReps] = useState(ejercicio.repeticiones ?? '')
  const [descanso, setDescanso] = useState(ejercicio.descanso ?? '')
  const [carga, setCarga] = useState(ejercicio.carga ?? '')
  const [notas, setNotas] = useState(ejercicio.observaciones ?? '')
  const nombreRef = useRef<HTMLInputElement>(null)

  // Touch drag state
  const touchStartY = useRef<number>(0)
  const touchStartIndex = useRef<number>(0)
  const isDraggingTouch = useRef<boolean>(false)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing && nombreRef.current) {
      setTimeout(() => nombreRef.current?.focus(), 50)
    }
  }, [editing])

  const handleSave = () => {
    onUpdate({
      nombre: nombre || 'Ejercicio',
      series: series ? parseInt(series) : null,
      repeticiones: reps || null,
      descanso: descanso || null,
      carga: carga || null,
      observaciones: notas || null,
    })
    setEditing(false)
  }

  // ── Touch handlers para drag & drop ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (editing) return
    touchStartY.current = e.touches[0].clientY
    touchStartIndex.current = index
    isDraggingTouch.current = false
    onDragStart?.(index)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (editing) return
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (deltaY > 8) {
      isDraggingTouch.current = true
      e.preventDefault() // prevenir scroll mientras arrastra

      // Detectar sobre qué elemento está el dedo
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const exerciseEl = el?.closest('[data-exercise-index]')
      if (exerciseEl) {
        const targetIndex = parseInt(exerciseEl.getAttribute('data-exercise-index') || '-1')
        if (targetIndex !== -1 && targetIndex !== index) {
          onDragEnter?.(targetIndex)
        }
      }
    }
  }

  const handleTouchEnd = () => {
    isDraggingTouch.current = false
    onDragEnd?.()
  }

  const displayNombre = nombre || ejercicio.nombre || 'Ejercicio'

  return (
    <div
      data-exercise-index={index}
      style={{
        opacity: isDragging ? 0.4 : 1,
        background: isDragOver ? 'rgba(125,5,49,0.06)' : 'transparent',
        borderTop: isDragOver ? '2px solid #7D0531' : '1px solid rgba(51,65,85,0.6)',
        transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
        touchAction: editing ? 'auto' : 'none',
      }}
      className="flex items-start gap-2 py-2.5 px-3 last:border-b-0"
    >
      {/* Handle de drag — solo visible cuando no está editando */}
      {!editing && (
        <div
          ref={dragHandleRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          // Mouse drag (desktop)
          draggable
          onDragStart={() => onDragStart?.(index)}
          onDragEnd={onDragEnd}
          style={{
            cursor: 'grab',
            padding: '4px 2px',
            marginTop: '2px',
            touchAction: 'none',
            userSelect: 'none',
            flexShrink: 0,
          }}
          title="Arrastrá para reordenar"
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
            <circle cx="4" cy="3" r="1.5" fill="#64748B"/>
            <circle cx="8" cy="3" r="1.5" fill="#64748B"/>
            <circle cx="4" cy="8" r="1.5" fill="#64748B"/>
            <circle cx="8" cy="8" r="1.5" fill="#64748B"/>
            <circle cx="4" cy="13" r="1.5" fill="#64748B"/>
            <circle cx="8" cy="13" r="1.5" fill="#64748B"/>
          </svg>
        </div>
      )}

      {editing && <span className="mt-1 text-slate-600 text-xs select-none pt-0.5 w-4" />}

      <div className="flex-1 min-w-0">
        {!editing && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200 text-sm truncate">
              {displayNombre}
            </span>
            <span className="text-slate-500 text-xs shrink-0">
              {ejercicio.series ? `${ejercicio.series}×` : ''}
              {ejercicio.repeticiones}
              {ejercicio.carga ? ` · ${ejercicio.carga}` : ''}
              {ejercicio.descanso ? ` · ${ejercicio.descanso}` : ''}
            </span>
          </div>
        )}

        {editing && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                Nombre del ejercicio
              </label>
              <input
                ref={nombreRef}
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                className="w-full bg-slate-800 border border-green-500/40 rounded-lg px-3 py-2
                  text-sm text-white font-medium placeholder-slate-600
                  focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/20"
                placeholder="Ej: Sentadilla con barra, Press de banca..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Series</label>
                <input
                  type="number"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white focus:outline-none focus:border-slate-500"
                  placeholder="3"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Reps</label>
                <input
                  type="text"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white focus:outline-none focus:border-slate-500"
                  placeholder="12 o 30seg"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Carga</label>
                <input
                  type="text"
                  value={carga}
                  onChange={(e) => setCarga(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white focus:outline-none focus:border-slate-500"
                  placeholder="20kg / PC"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Descanso</label>
                <input
                  type="text"
                  value={descanso}
                  onChange={(e) => setDescanso(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white focus:outline-none focus:border-slate-500"
                  placeholder="60 seg"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Notas</label>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white focus:outline-none focus:border-slate-500"
                  placeholder="Observaciones para el alumno..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm py-2
                  rounded-lg font-semibold transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  if (isNuevo) { onDelete(); return }
                  setNombre(ejercicio.nombre ?? '')
                  setEditing(false)
                }}
                className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm
                  py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="w-8 h-8 rounded flex items-center justify-center
              text-slate-500 hover:bg-slate-700 hover:text-white transition-colors"
            title="Editar"
          >✎</button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded flex items-center justify-center
              text-slate-600 hover:bg-red-900/40 hover:text-red-400 transition-colors"
            title="Eliminar"
          >×</button>
        </div>
      )}
    </div>
  )
}
