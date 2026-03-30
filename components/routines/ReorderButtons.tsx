// components/routines/ReorderButtons.tsx

interface Props {
  onUp: () => void
  onDown: () => void
  disableUp?: boolean
  disableDown?: boolean
}

export function ReorderButtons({ onUp, onDown, disableUp, disableDown }: Props) {
  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={onUp}
        disabled={disableUp}
        className="w-7 h-7 rounded flex items-center justify-center text-slate-400
          hover:bg-slate-700 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed
          transition-colors text-xs"
        title="Subir"
      >
        ▲
      </button>
      <button
        onClick={onDown}
        disabled={disableDown}
        className="w-7 h-7 rounded flex items-center justify-center text-slate-400
          hover:bg-slate-700 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed
          transition-colors text-xs"
        title="Bajar"
      >
        ▼
      </button>
    </div>
  )
}
