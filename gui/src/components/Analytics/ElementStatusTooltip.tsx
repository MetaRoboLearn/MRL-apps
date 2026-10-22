import { createPortal } from 'react-dom'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'

type ElementStatusTooltipProps = {
  label: string
  status: 'detected' | 'detected_with_issue' | 'not_detected'
  issues: { line: number | null; issue: string }[]
}

export function ElementStatusTooltip({ label, status, issues }: ElementStatusTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const tooltipId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const statusLabel = status === 'detected_with_issue'
    ? 'Detektirano uz problem'
    : status === 'detected'
      ? 'Detektirano bez problema'
      : 'Nije detektirano'
  const tooltipText = [
    statusLabel,
    ...issues.map(({ line, issue }) => `Redak ${line ?? '—'}: ${issue}`),
  ].join('\n')

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const showTooltip = () => {
    cancelClose()
    setIsOpen(true)
  }

  const closeTooltipSoon = () => {
    cancelClose()
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false)
      closeTimerRef.current = null
    }, 160)
  }

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) {
      if (!isOpen) setPosition(null)
      return
    }

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect()
      const tooltipRect = tooltipRef.current?.getBoundingClientRect()
      if (!triggerRect || !tooltipRect) return

      const viewportMargin = 8
      const left = Math.min(
        Math.max(viewportMargin, triggerRect.left),
        Math.max(viewportMargin, window.innerWidth - tooltipRect.width - viewportMargin),
      )
      const fitsBelow = triggerRect.bottom + tooltipRect.height + viewportMargin <= window.innerHeight
      const top = fitsBelow
        ? triggerRect.bottom + viewportMargin
        : Math.max(viewportMargin, triggerRect.top - tooltipRect.height - viewportMargin)
      setPosition({ left, top })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, tooltipText])

  return (
    <>
      <span
        ref={triggerRef}
        role="img"
        tabIndex={0}
        aria-label={`${label}: ${tooltipText}`}
        aria-describedby={isOpen ? tooltipId : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={closeTooltipSoon}
        onFocus={showTooltip}
        onBlur={closeTooltipSoon}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false)
        }}
        className="inline-flex shrink-0 cursor-help rounded p-1 text-gray-500 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise-700"
      >
        <FaInfoCircle aria-hidden="true" size={13} />
      </span>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          onMouseEnter={showTooltip}
          onMouseLeave={closeTooltipSoon}
          className="fixed z-[100] max-h-[calc(100vh-1rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-800 shadow-xl"
          style={{
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          <p className="font-semibold">{statusLabel}</p>
          {issues.map(({ line, issue }) => (
            <p key={`${line}-${issue}`} className="mt-1 text-amber-800">Redak {line ?? '—'}: {issue}</p>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}