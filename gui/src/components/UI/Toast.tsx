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
    <div className={`toast toast-error ${isExiting ? 'toast-exit' : 'toast-enter'}`}>
      <p className={'toast-text'}>{message}</p>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(close, 300);
        }}
        className={'toast-close'}
      >
        {"\u2573"}
      </button>
    </div>
  );
};

export default Toast;