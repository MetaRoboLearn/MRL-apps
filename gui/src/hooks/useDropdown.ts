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

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  return {
    dropdownRef,
    isOpen,
    toggle: () => setIsOpen((value) => !value),
    close: () => setIsOpen(false),
  }
}