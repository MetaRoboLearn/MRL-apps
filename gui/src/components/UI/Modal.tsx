import { useEffect, useRef } from "react";
import {useUI} from "../../hooks/useUI.ts";

const Modal = () => {
  const { modalVisible, modalHeader, modalBody, modalFooter, setModalVisible } = useUI();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!modalVisible) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalVisible(false);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [modalVisible, setModalVisible]);

  return (
    <div className={`font-display absolute w-full h-full bg-black/25 flex-center transition-opacity duration-300 ease-in-out z-100
                    ${modalVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
         aria-hidden={!modalVisible}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-modal-title"
        tabIndex={-1}
        className={`bg-sunglow-500 mx-auto min-w-90 max-w-130 p-6 rounded-md shadow-2xl text-dark transform transition-all duration-300 ease-in-out
                      ${modalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <div className="flex items-start justify-between gap-4 border-b-2 border-sunglow-800 px-1 pb-3 pt-1">
          <h2 id="global-modal-title" className="text-3xl font-semibold">
          {modalHeader}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setModalVisible(false)}
            aria-label="Zatvori prozor"
            className="rounded px-2 py-1 text-2xl leading-none text-dark-neutrals-500 hover:bg-sunglow-600"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="block text-xl pt-3 pl-2 pr-5">{modalBody}</div>
        <div className={`block text-lg text-right ${modalFooter ? 'pt-6' : ''}`}>{modalFooter}</div>
      </div>
    </div>
  );
};

export default Modal;
