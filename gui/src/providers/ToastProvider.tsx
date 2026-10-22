import {PropsWithChildren, useMemo, useState} from "react";
import {ToastContext} from "./Context.tsx";
import Toast from "../components/UI/Toast.tsx";

type ToastType = {
  message: string;
  id: number;
}

const ToastProvider = ({children} : PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const showToast = (message: string) => {
    const newToast = {
      id: Date.now(),
      message: message,
    };
    setToasts((prevToasts) => ([...prevToasts, newToast]));
  }

  const closeToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter(toast => toast.id !== id));
  }

  const contextValue = useMemo(() => ({
    showToast, closeToast
  }), [])

  return (
    <>
      <ToastContext.Provider value={contextValue}>
        {children}
        <div className={'toast-container'}>
          {toasts && toasts.map(toast => {
            return (
              <Toast
                key={toast.id}
                message={toast.message}
                close={() => closeToast(toast.id)} />
            )
          })}
        </div>
      </ToastContext.Provider>
    </>
  );
};

export default ToastProvider;