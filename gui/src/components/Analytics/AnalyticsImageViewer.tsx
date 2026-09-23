import { useState } from 'react'

type AnalyticsImageViewerProps = {
  title: string
  src: string
}

export function AnalyticsImageViewer({ title, src }: AnalyticsImageViewerProps) {
  const [scale, setScale] = useState(1)

  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => setScale((value) => Math.max(0.5, value - 0.25))} className="rounded border px-2 py-1 hover:bg-gray-50" aria-label={`Zoom out ${title}`}>
            −
          </button>
          <span className="min-w-12 text-center">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((value) => Math.min(3, value + 0.25))} className="rounded border px-2 py-1 hover:bg-gray-50" aria-label={`Zoom in ${title}`}>
            +
          </button>
          <button type="button" onClick={() => setScale(1)} className="rounded border px-2 py-1 hover:bg-gray-50">
            Reset
          </button>
        </div>
      </div>
      <div className="max-h-[34rem] overflow-auto bg-gray-50 p-4">
        <img src={src} alt={title} className="max-w-none origin-top-left" style={{ width: `${scale * 100}%` }} />
      </div>
    </section>
  )
}