// types/routines.ts

export type TipoBloque =
  | 'normal'
  | 'circuito'
  | 'superserie'
  | 'entrada_en_calor'
  | 'vuelta_a_la_calma'

export interface Bloque {
  id: string
  dia_id: string
  nombre: string
  tipo: TipoBloque
  descripcion?: string | null
  rondas?: number | null
  descanso_entre_rondas?: number | null
  orden: number
  creado_en?: string
  ejercicios?: Ejercicio[]
}

export interface Ejercicio {
  id: string
  dia_id: string
  bloque_id?: string | null
  nombre?: string
  series?: number | null
  repeticiones?: string | null
  descanso?: string | null
  observaciones?: string | null
  orden?: number
  carga?: string | null
}

export interface DiaConBloques {
  id: string
  plan_id?: string
  numero: number
  nombre?: string | null
  bloques: Bloque[]
  ejercicios_legacy: Ejercicio[]
  tiene_bloques: boolean
}

export interface BloqueFormData {
  nombre: string
  tipo: TipoBloque
  descripcion?: string
  rondas?: number
  descanso_entre_rondas?: number
}

export const TIPO_BLOQUE_CONFIG: Record<TipoBloque, { label: string; color: string; bgColor: string; emoji: string }> = {
  normal:            { label: 'Normal',            color: 'text-blue-400',   bgColor: 'bg-blue-950/40 border-blue-800',    emoji: '🔵' },
  circuito:          { label: 'Circuito',          color: 'text-green-400',  bgColor: 'bg-green-950/40 border-green-800',  emoji: '🟢' },
  superserie:        { label: 'Superserie',        color: 'text-violet-400', bgColor: 'bg-violet-950/40 border-violet-800', emoji: '🟣' },
  entrada_en_calor:  { label: 'Entrada en calor',  color: 'text-orange-400', bgColor: 'bg-orange-950/40 border-orange-800', emoji: '🟠' },
  vuelta_a_la_calma: { label: 'Vuelta a la calma', color: 'text-cyan-400',   bgColor: 'bg-cyan-950/40 border-cyan-800',    emoji: '🩵' },
}
