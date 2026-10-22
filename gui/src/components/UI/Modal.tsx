import {useUI} from "../../hooks/useUI.ts";

const Modal = () => {
  const { modalVisible, modalHeader, modalBody, modalFooter } = useUI();

  return (
    <div className={`font-display absolute w-full h-full bg-black/25 flex-center transition-opacity duration-300 ease-in-out z-100
                    ${modalVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-sunglow-500 mx-auto min-w-90 max-w-130 p-6 rounded-md shadow-2xl text-dark transform transition-all duration-300 ease-in-out
                      ${modalVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <p className="text-3xl font-semibold px-1 pt-1 pb-3 pr-10 border-b-2 border-sunglow-800">
          {modalHeader}
        </p>
        <div className="block text-xl pt-3 pl-2 pr-5">{modalBody}</div>
        <div className={`block text-lg text-right ${modalFooter ? 'pt-6' : ''}`}>{modalFooter}</div>
      </div>
    </div>
  );
};

export default Modal;
