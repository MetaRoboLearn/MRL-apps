import { useEffect, useRef, useState } from 'react'

export function useDropdown<T extends HTMLElement>() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<T>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Node) || !dropdownRef.current?.contains(target)) {
        setIsOpen(false)
        return
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return {
    dropdownRef,
    isOpen,
    toggle: () => setIsOpen((value) => !value),
    close: () => setIsOpen(false),
  }
}