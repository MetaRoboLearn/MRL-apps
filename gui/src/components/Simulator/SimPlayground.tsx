import {useState} from "react";
import SimInterface from "./UI/SimInterface.tsx";
import SimCanvas from "./Scene/SimCanvas.tsx";

const SimPlayground = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={`bg-turquoise-50 flex-center flex-col flex-grow w-full
              border-t-8 border-y-10 border-turquoise-700 relative overflow-hidden`}
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}>
      <SimCanvas/>
      <SimInterface isHovered={isHovered} />
    </div>
  );
};

export default SimPlayground;
