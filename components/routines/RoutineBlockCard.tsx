// components/routines/RoutineBlockCard.tsx
'use client'

import { useState, useRef } from 'react'
import type { Bloque, Ejercicio, TipoBloque, BloqueFormData } from '@/types/routines'
import { TIPO_BLOQUE_CONFIG } from '@/types/routines'
import { RoutineExerciseItem } from './RoutineExerciseItem'

// ── ReorderControls ───────────────────────────────────────
interface ReorderProps {
  onUp: () => void
  onDown: () => void
  disableUp?: boolean
  disableDown?: boolean
}

function ReorderControls({ onUp, onDown, disableUp, disableDown }: ReorderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={onUp}
        disabled={disableUp}
        className="w-6 h-6 rounded-md flex items-center justify-center
          text-slate-500 hover:text-slate-200 hover:bg-slate-700
          disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[10px]"
      >▲</button>
      <button
        onClick={onDown}
        disabled={disableDown}
        className="w-6 h-6 rounded-md flex items-center justify-center
          text-slate-500 hover:text-slate-200 hover:bg-slate-700
          disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[10px]"
      >▼</button>
    </div>
  )
}

// ── BlockTypePills ────────────────────────────────────────
const TIPOS: { value: TipoBloque; label: string; emoji: string }[] = [
  { value: 'normal',            label: 'Normal',       emoji: '💪' },
  { value: 'entrada_en_calor',  label: 'Calor',        emoji: '🔥' },
  { value: 'circuito',          label: 'Circuito',     emoji: '🔁' },
  { value: 'superserie',        label: 'Superserie',   emoji: '⚡' },
  { value: 'vuelta_a_la_calma', label: 'Calma',        emoji: '🧘' },
]

const TIPO_COLORS: Record<TipoBloque, string> = {
  normal:            'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25',
  circuito:          'bg-green-500/15 text-green-300 border-green-500/30 hover:bg-green-500/25',
  superserie:        'bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/25',
  entrada_en_calor:  'bg-orange-500/15 text-orange-300 border-orange-500/30 hover:bg-orange-500/25',
  vuelta_a_la_calma: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25',
}

const TIPO_ACTIVE: Record<TipoBloque, string> = {
  normal:            'bg-blue-500 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]',
  circuito:          'bg-green-500 text-white border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.4)]',
  superserie:        'bg-violet-500 text-white border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.4)]',
  entrada_en_calor:  'bg-orange-500 text-white border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.4)]',
  vuelta_a_la_calma: 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]',
}

interface BlockTypePillsProps {
  value: TipoBloque
  onChange: (tipo: TipoBloque) => void
}

function BlockTypePills({ value, onChange }: BlockTypePillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TIPOS.map((t) => {
        const isActive = value === t.value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
              border transition-all duration-150 cursor-pointer
              ${isActive ? TIPO_ACTIVE[t.value] : TIPO_COLORS[t.value]}`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── SecondaryButton ───────────────────────────────────────
function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        bg-slate-800 border border-slate-700 text-slate-400
        hover:bg-slate-700 hover:text-slate-200 hover:border-slate-600
        transition-all duration-150"
    >
      {children}
    </button>
  )
}

// ── DangerButton ──────────────────────────────────────────
function DangerButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        bg-slate-800 border border-slate-700 text-slate-500
        hover:bg-red-950/50 hover:text-red-400 hover:border-red-900
        transition-all duration-150"
    >
      {children}
    </button>
  )
}

// ── BlockCard ─────────────────────────────────────────────
interface Props {
  bloque: Bloque
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onDuplicate: () => void
  onUpdate: (data: Partial<BloqueFormData>) => void
  onAddEjercicio: (bloqueId: string) => void
  onUpdateEjercicio: (ejercicioId: string, data: any) => void
  onDeleteEjercicio: (ejercicioId: string) => void
  onMoveEjercicio: (ejercicioId: string, direccion: 'up' | 'down') => void
  onMoveEjercicioABloque?: (ejercicioId: string, bloqueDestinoId: string) => void
  otrosBloques?: { id: string; nombre: string }[]
}

export function RoutineBlockCard({
  bloque, index, total,
  onMoveUp, onMoveDown, onDelete, onDuplicate,
  onUpdate, onAddEjercicio, onUpdateEjercicio, onDeleteEjercicio, onMoveEjercicio,
  onMoveEjercicioABloque, otrosBloques = []
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const [editingNombre, setEditingNombre] = useState(false)
  const ejercicios = bloque.ejercicios ?? []
  const isCircuito = bloque.tipo === 'circuito' || bloque.tipo === 'superserie'

  // Drag & drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      // Reordenar: mover dragIndex a dragOverIndex
      const steps = dragIndex < dragOverIndex ? dragOverIndex - dragIndex : dragIndex - dragOverIndex
      const dir = dragIndex < dragOverIndex ? 'down' : 'up'
      // Ejecutar movimientos secuenciales
      let current = dragIndex
      for (let i = 0; i < steps; i++) {
        onMoveEjercicio(ejercicios[current].id, dir)
        current = dir === 'down' ? current + 1 : current - 1
      }
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const tipoActivo = TIPOS.find(t => t.value === bloque.tipo)

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 backdrop-blur-sm
      shadow-[0_2px_16px_rgba(0,0,0,0.3)] transition-all duration-200 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/40">
        <ReorderControls
          onUp={onMoveUp}
          onDown={onMoveDown}
          disableUp={index === 0}
          disableDown={index === total - 1}
        />

        <div className="flex-1 min-w-0">
          {editingNombre ? (
            <input
              autoFocus
              type="text"
              defaultValue={bloque.nombre}
              onBlur={(e) => { onUpdate({ nombre: e.target.value }); setEditingNombre(false) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setEditingNombre(false)
              }}
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg
                px-2.5 py-1 text-white font-semibold text-sm
                focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20"
            />
          ) : (
            <button
              onClick={() => setEditingNombre(true)}
              className="text-left font-bold text-slate-100 text-sm hover:text-white
                transition-colors w-full truncate group flex items-center gap-1.5"
            >
              {bloque.nombre}
              <span className="text-slate-600 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                ✎
              </span>
            </button>
          )}

          <div className="flex items-center gap-2 mt-1">
            {tipoActivo && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase
                tracking-widest px-2 py-0.5 rounded-full border
                ${TIPO_COLORS[bloque.tipo]}`}>
                {tipoActivo.emoji} {tipoActivo.label}
              </span>
            )}
            {isCircuito && bloque.rondas && (
              <span className="text-[10px] text-slate-500 font-medium">
                {bloque.rondas} rondas
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-7 h-7 rounded-lg flex items-center justify-center
            text-slate-500 hover:text-slate-300 hover:bg-slate-700/50
            transition-all text-[10px]"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* ── Contenido ── */}
      {expanded && (
        <div className="px-4 py-3 space-y-4">

          {/* Tipo de bloque */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Tipo de bloque
            </label>
            <BlockTypePills
              value={bloque.tipo}
              onChange={(tipo) => onUpdate({ tipo })}
            />
          </div>

          {/* Rondas y descanso (solo circuito/superserie) */}
          {isCircuito && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Rondas
                </label>
                <input
                  type="number"
                  min={1}
                  value={bloque.rondas ?? ''}
                  onChange={(e) => onUpdate({ rondas: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="3"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg
                    px-3 py-2 text-sm text-slate-200 placeholder-slate-600
                    focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/10
                    transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Descanso entre rondas (seg)
                </label>
                <input
                  type="number"
                  min={0}
                  value={bloque.descanso_entre_rondas ?? ''}
                  onChange={(e) => onUpdate({ descanso_entre_rondas: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="60"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg
                    px-3 py-2 text-sm text-slate-200 placeholder-slate-600
                    focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/10
                    transition-all"
                />
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Descripción <span className="normal-case font-normal text-slate-600">(opcional)</span>
            </label>
            <input
              type="text"
              value={bloque.descripcion ?? ''}
              onChange={(e) => onUpdate({ descripcion: e.target.value || undefined })}
              placeholder="Instrucciones o notas para este bloque..."
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg
                px-3 py-2 text-sm text-slate-200 placeholder-slate-600
                focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/10
                transition-all"
            />
          </div>

          {/* Ejercicios */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 overflow-hidden">
            {ejercicios.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-slate-600 text-xs">Sin ejercicios en este bloque</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {ejercicios.map((ej, i) => (
                  <div key={ej.id}>
                    <RoutineExerciseItem
                      ejercicio={ej}
                      index={i}
                      total={ejercicios.length}
                      onMoveUp={() => onMoveEjercicio(ej.id, 'up')}
                      onMoveDown={() => onMoveEjercicio(ej.id, 'down')}
                      onDelete={() => onDeleteEjercicio(ej.id)}
                      onUpdate={(data) => onUpdateEjercicio(ej.id, data)}
                      onDragStart={(idx) => setDragIndex(idx)}
                      onDragEnter={(idx) => setDragOverIndex(idx)}
                      onDragEnd={handleDragEnd}
                      isDragging={dragIndex === i}
                      isDragOver={dragOverIndex === i}
                    />
                    {/* Mover a otro bloque — solo si hay más de un bloque */}
                    {otrosBloques.length > 0 && onMoveEjercicioABloque && (
                      <div className="flex items-center gap-1 px-3 pb-1">
                        <span className="text-[10px] text-slate-600">Mover a:</span>
                        {otrosBloques.map(ob => (
                          <button
                            key={ob.id}
                            onClick={() => onMoveEjercicioABloque(ej.id, ob.id)}
                            className="text-[10px] px-2 py-0.5 rounded-md border border-slate-700
                              text-slate-500 hover:text-green-400 hover:border-green-500/50
                              hover:bg-green-500/5 transition-all"
                          >
                            → {ob.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botón agregar ejercicio */}
            <button
              onClick={() => onAddEjercicio(bloque.id)}
              className="w-full py-2.5 flex items-center justify-center gap-2
                text-xs font-semibold text-slate-500
                border-t border-slate-800/60
                hover:text-green-400 hover:bg-green-500/5
                transition-all duration-150"
            >
              <span className="text-base leading-none">+</span>
              Agregar ejercicio
            </button>
          </div>

          {/* Acciones del bloque */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <SecondaryButton onClick={onDuplicate}>
              ⧉ Duplicar
            </SecondaryButton>
            <DangerButton onClick={onDelete}>
              🗑 Eliminar bloque
            </DangerButton>
          </div>

        </div>
      )}
    </div>
  )
}
