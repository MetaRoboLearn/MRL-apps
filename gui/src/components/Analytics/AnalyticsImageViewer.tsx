import { useEffect, useRef, useState } from 'react'

type AnalyticsImageViewerProps = {
  title: string
  src: string
}

export function AnalyticsImageViewer({ title, src }: AnalyticsImageViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [loadedImage, setLoadedImage] = useState<{ src: string; width: number; height: number } | null>(null)
  const [zoomState, setZoomState] = useState({ src, value: 1 })

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const resizeObserver = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    resizeObserver.observe(viewport)
    return () => resizeObserver.disconnect()
  }, [])

  const image = loadedImage?.src === src ? loadedImage : null
  const zoom = zoomState.src === src ? zoomState.value : 1
  const fitScale = image && viewportSize.width > 0 && viewportSize.height > 0
    ? Math.min(viewportSize.width / image.width, viewportSize.height / image.height, 1)
    : 1
  const imageWidth = image ? image.width * fitScale * zoom : 0
  const imageHeight = image ? image.height * fitScale * zoom : 0

  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => setZoomState({ src, value: Math.max(0.5, zoom - 0.25) })} className="rounded border px-2 py-1 hover:bg-gray-50" aria-label={`Zoom out ${title}`}>
            −
          </button>
          <span className="min-w-12 text-center">{Math.round(fitScale * zoom * 100)}%</span>
          <button type="button" onClick={() => setZoomState({ src, value: Math.min(3, zoom + 0.25) })} className="rounded border px-2 py-1 hover:bg-gray-50" aria-label={`Zoom in ${title}`}>
            +
          </button>
          <button type="button" onClick={() => setZoomState({ src, value: 1 })} className="rounded border px-2 py-1 hover:bg-gray-50">
            Reset
          </button>
        </div>
      </div>
      <div ref={viewportRef} className="h-[34rem] max-h-[70vh] overflow-auto bg-gray-50 p-4">
        <div
          className="flex items-center justify-center"
          style={{ width: `${Math.max(viewportSize.width, imageWidth)}px`, height: `${Math.max(viewportSize.height, imageHeight)}px` }}
        >
          <img
            src={src}
            alt={title}
            className="block max-w-none"
            onLoad={(event) => setLoadedImage({ src, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            style={{ width: `${imageWidth}px` }}
          />
        </div>
      </div>
    </section>
  )
}