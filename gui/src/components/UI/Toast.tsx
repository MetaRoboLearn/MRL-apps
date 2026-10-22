import {useEffect, useRef, useState} from "react";

interface Props {
  message: string;
  close: () => void;
}

const useTimeout = (callback: () => void) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const id = setTimeout(() => savedCallback.current(), 3000);
    return () => clearTimeout(id);
  }, []);
};

const Toast = ({message, close}: Props) => {
  const [isExiting, setIsExiting] = useState(false);

  useTimeout(() => {
    setIsExiting(true);
    setTimeout(close, 300);
  });

  return (
    <div
      className={`toast toast-error ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <p className={'toast-text'}>{message}</p>
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          setTimeout(close, 300);
        }}
        aria-label="Zatvori obavijest"
        className={'toast-close'}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
};

export default Toast;