import {PropsWithChildren, useState} from "react";

interface Props {
  title: string;
}

const CodeSnippetEntry = ({title, children}: PropsWithChildren<Props>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`bg-tomato-100 w-full mb-1 py-4 px-6 z-10
                        font-display text-dark-neutrals-400 font-semibold text-lg 
                        flex justify-between items-center 
                        border-b-tomato-200 border-b-3 select-none 
                        hover:cursor-pointer hover:text-dark-neutrals-800 transition`}
           onClick={() => setIsOpen(!isOpen)}>
        <span>{title}</span>
        <svg className={`w-4 h-4 ms-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
             aria-hidden="true"
             xmlns="http://www.w3.org/2000/svg"
             fill="none"
             viewBox="0 0 10 6">
          <path stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 1 4 4 4-4"/>
        </svg>
      </div>
      <div className={`bg-white-smoke-400 w-full py-4 px-4 font-display text-dark-neutrals-400 transition duration-300 ease-in-out -translate-y-1
                        ${isOpen ? "block" : "hidden"}`}>
        {children}
      </div>
    </>
  );
};

export default CodeSnippetEntry;
