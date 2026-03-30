// components/routines/RoutineDayEditor.tsx
'use client'

import { useEffect } from 'react'
import { useRoutineBlocks } from '@/hooks/useRoutineBlocks'
import { RoutineBlockCard } from './RoutineBlockCard'
import { supabase } from '@/lib/supabase'

interface Props {
  diaId: string
  diaNombre: string
  diaNumero: number
  onAgregarEjercicio: (bloqueId: string, diaId: string) => void
}

export function RoutineDayEditor({ diaId, diaNombre, diaNumero, onAgregarEjercicio }: Props) {
  const {
    bloques, loading, error,
    load, agregarBloque, actualizarBloque, eliminarBloque, duplicarBloque, moverBloque
  } = useRoutineBlocks(diaId)

  useEffect(() => { load() }, [load])

  const handleAddEjercicio = async (bloqueId: string) => {
    const client = supabase as any
    const ejerciciosDelBloque = bloques.find(b => b.id === bloqueId)?.ejercicios ?? []
    const { error } = await client.from('ejercicios').insert({
      dia_id: diaId,
      bloque_id: bloqueId,
      nombre: 'Nuevo ejercicio',
      series: 3,
      repeticiones: '12',
      carga: '',
      descanso: '60',
      orden: ejerciciosDelBloque.length,
    })
    if (error) console.error('Error agregando ejercicio:', error)
    await load()
  }

  const handleUpdateEjercicio = async (ejercicioId: string, data: any) => {
    const client = supabase as any
    await client.from('ejercicios').update(data).eq('id', ejercicioId)
    await load()
  }

  const handleDeleteEjercicio = async (ejercicioId: string) => {
    await supabase.from('ejercicios').delete().eq('id', ejercicioId)
    await load()
  }

  const handleMoverEjercicio = async (
    bloqueId: string,
    ejercicioId: string,
    direccion: 'up' | 'down'
  ) => {
    const bloque = bloques.find((b) => b.id === bloqueId)
    if (!bloque?.ejercicios) return
    const ejs = [...bloque.ejercicios]
    const idx = ejs.findIndex((e) => e.id === ejercicioId)
    const newIdx = direccion === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= ejs.length) return
    ;[ejs[idx], ejs[newIdx]] = [ejs[newIdx], ejs[idx]]
    const client = supabase as any
    for (let i = 0; i < ejs.length; i++) {
      await client.from('ejercicios').update({ orden: i }).eq('id', ejs[i].id)
    }
    await load()
  }

  // ── MOVER EJERCICIO A OTRO BLOQUE ──
  const handleMoverABloque = async (ejercicioId: string, bloqueDestinoId: string) => {
    const client = supabase as any
    // Calcular el orden dentro del bloque destino
    const bloqueDestino = bloques.find(b => b.id === bloqueDestinoId)
    const ordenDestino = bloqueDestino?.ejercicios?.length ?? 0

    await client
      .from('ejercicios')
      .update({ bloque_id: bloqueDestinoId, orden: ordenDestino })
      .eq('id', ejercicioId)

    await load()
  }

  return (
    <div className="space-y-3">

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg
          bg-red-950/40 border border-red-900/60 text-red-400 text-xs">
          <span>⚠</span> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-slate-500 text-sm">
          <span className="animate-spin text-base">⟳</span>
          Cargando bloques…
        </div>
      ) : (
        <div className="space-y-3">

          {bloques.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="text-3xl mb-3">🧱</div>
              <p className="text-slate-400 text-sm font-medium mb-1">Sin bloques todavía</p>
              <p className="text-slate-600 text-xs">
                Agregá bloques para organizar los ejercicios del día
              </p>
            </div>
          )}

          {bloques.map((bloque, i) => (
            <RoutineBlockCard
              key={bloque.id}
              bloque={bloque}
              index={i}
              total={bloques.length}
              otrosBloques={bloques.filter(b => b.id !== bloque.id).map(b => ({ id: b.id, nombre: b.nombre }))}
              onMoveUp={() => moverBloque(bloque.id, 'up')}
              onMoveDown={() => moverBloque(bloque.id, 'down')}
              onDelete={() => eliminarBloque(bloque.id)}
              onDuplicate={() => duplicarBloque(bloque)}
              onUpdate={(data) => actualizarBloque(bloque.id, data)}
              onAddEjercicio={handleAddEjercicio}
              onUpdateEjercicio={handleUpdateEjercicio}
              onDeleteEjercicio={handleDeleteEjercicio}
              onMoveEjercicio={(ejId, dir) => handleMoverEjercicio(bloque.id, ejId, dir)}
              onMoveEjercicioABloque={handleMoverABloque}
            />
          ))}

          <button
            onClick={() => agregarBloque({
              nombre: `Bloque ${String.fromCharCode(65 + bloques.length)}`,
              tipo: 'normal',
            })}
            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-700/60
              text-slate-500 text-sm font-semibold
              hover:border-green-500/40 hover:text-green-400 hover:bg-green-500/5
              transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            <span className="text-lg leading-none group-hover:scale-110 transition-transform">+</span>
            Agregar bloque al Día {diaNumero}
          </button>

        </div>
      )}
    </div>
  )
}
