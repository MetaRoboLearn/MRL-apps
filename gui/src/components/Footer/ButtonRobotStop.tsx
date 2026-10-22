import {FaStop} from "react-icons/fa";
import { useMutation } from "@tanstack/react-query";
import { sendAbort } from "../../api/brokerApi.ts";
import {useConsole} from "../../hooks/useConsole.ts";

const ButtonRobotStop = ({ disabled, robot }: { disabled: boolean; robot: string | null }) => {
  const { addLog } = useConsole();

  const mutation = useMutation({
    mutationFn: () => {
      if (!robot) throw new Error("No robot selected");
      return sendAbort(robot);
    },
    onError: (e) => console.error("Failed to send abort:", e),
  });

  return (
    <button disabled={disabled}
            className={`bg-tomato-500 text-light-cyan-200 button-square ml-2 
                    ${disabled ? 'bg-tomato-700 text-light-cyan-700' : 'hover:cursor-pointer hover:bg-tomato-600'} transition`}
            onClick={() => {
              if (!robot) {
                addLog("ERROR","Abort - No robot selected");
                return;
              }
              mutation.mutate();
            }}
    >
      <FaStop size={18}/>
    </button>
  );
};

export default ButtonRobotStop;