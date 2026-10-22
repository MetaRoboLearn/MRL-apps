import { useState } from "react";
import { FaRobot } from "react-icons/fa";
import { useCode } from "../../hooks/useCode.ts";
import { useMutation } from "@tanstack/react-query";
import { sendCommand } from "../../api/brokerApi.ts";
import { useTaskConfig } from "../../hooks/useTaskConfig.ts";
import {useConsole} from "../../hooks/useConsole.ts";

const ButtonRobotRun = ({ disabled, robot }: { disabled: boolean; robot: string | null }) => {
  const TEACH_PASS = 'mrl1703';
  const { getCurrentCode } = useCode();
  const { ustId, setAwaitingReview } = useTaskConfig();
  const { addLog } = useConsole();

  const [confirming, setConfirming] = useState(false);
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);

  const mutation = useMutation({
    mutationFn: (code: string) => {
      if (!robot) throw new Error("No robot selected");
      setAwaitingReview(true);
      return sendCommand(robot, code, ustId);
    },
    onError: (e) => console.error("Failed to send command:", e),
  });

  const handleConfirm = () => {
    if (input !== TEACH_PASS) {
      setWrong(true);
      setInput('');
      return;
    }
    setConfirming(false);
    setInput('');
    setWrong(false);
    if (!robot) {
      addLog("ERROR","Run - No robot selected");
      return;
    }
    mutation.mutate(getCurrentCode());
  };

  const handleCancel = () => {
    setConfirming(false);
    setInput('');
    setWrong(false);
  };

  if (confirming) {
    return (
      <div className="flex items-center justify-center gap-2 ml-6">
        <div className="flex flex-col items-center">
          <input
            autoFocus
            type="password"
            value={input}
            placeholder="Lozinka..."
            onChange={e => { setInput(e.target.value); setWrong(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleConfirm();
              if (e.key === 'Escape') handleCancel();
            }}
            className={`px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-sunglow-500 w-36
              ${wrong ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
          />
          {wrong && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-1 w-36 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-center text-xs font-semibold text-red-700"
            >
              Pogresna lozinka!
            </div>
          )}
        </div>
        <button
          onClick={handleConfirm}
          className="bg-sunglow-500 hover:bg-sunglow-600 text-dark-neutrals-400 font-display font-bold text-sm px-4 py-2 rounded transition"
        >
          Pošalji
        </button>
        <button
          onClick={handleCancel}
          className="bg-gray-200 hover:bg-gray-300 text-dark-neutrals-400 font-display font-bold text-sm px-4 py-2 rounded transition"
        >
          Odustani
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={disabled || mutation.isPending}
      className={`bg-sunglow-500 text-dark-neutrals-400 font-display font-bold text-xl pl-5 pr-8 py-2 rounded flex items-center ml-2
        ${disabled || mutation.isPending ? 'bg-sunglow-700' : 'hover:cursor-pointer hover:bg-sunglow-600'} transition`}
      onClick={() => setConfirming(true)}
    >
      <FaRobot size={24} />
      <span className="ml-4">{mutation.isPending ? "Šaljem..." : "Upogoni"}</span>
    </button>
  );
};

export default ButtonRobotRun;