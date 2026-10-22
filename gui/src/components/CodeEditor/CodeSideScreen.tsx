import { PropsWithChildren, useState } from "react";
import { RiExpandLeftLine, RiExpandRightLine } from "react-icons/ri";

interface Props {
  active: boolean;
}

const CodeSideScreen = ({ active, children }: PropsWithChildren<Props>) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-tomato-50 h-full py-5 absolute top-0 right-0 
                      flex flex-col items-stretch overflow-y-scroll overflow-x-hidden scrollbar-red
                      border-tomato-600 border-t-8 border-b-10 
                      transition-all duration-400 ease-in-out
                      ${expanded && active ? 'w-full' : active ? 'w-128' : 'w-1/3'}
                      ${active ? 'translate-x-0' : 'translate-x-full'}`}>

      <button
        onClick={() => setExpanded(prev => !prev)}
        title={expanded ? 'Collapse' : 'Expand'}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-md
                   bg-tomato-100 hover:bg-tomato-200 text-tomato-600
                   transition-colors"
      >
        {expanded
          ? <RiExpandRightLine size={18} />
          : <RiExpandLeftLine size={18} />
        }
      </button>

      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default CodeSideScreen;