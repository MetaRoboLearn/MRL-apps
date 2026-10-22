import { FaPlay, FaUndo } from "react-icons/fa";
import { useCode } from "../../hooks/useCode.ts";
import { useVehicle } from "../../hooks/useVehicle.ts";
import { useGrid } from "../../hooks/useGrid.ts";

const ButtonSim = ({ disabled }: { disabled: boolean }) => {
  const { runCode } = useCode();
  const { queueMoves, setSimFinished, hasRun, setHasRun, reset } = useVehicle();
  const { finish } = useGrid();

  const needsReset = finish === null && hasRun;

  return (
    <button
      disabled={disabled}
      className={`bg-turquoise-500 text-light-cyan-200 button-lg ml-8
        ${disabled ? 'bg-turquoise-700 text-light-cyan-700' : 'hover:cursor-pointer hover:bg-turquoise-600'} transition`}
      onClick={async () => {
        if (needsReset) {
          reset();
          setHasRun(false);
          return;
        }
        const result = await runCode();
        if (result) {
          setSimFinished(result.finished);
          queueMoves(result.steps);
          if (finish === null) setHasRun(true);
        }
      }}
    >
      {needsReset ? <FaUndo size={18} /> : <FaPlay size={18} />}
      <span className="ml-4">{needsReset ? 'Resetiraj' : 'Simuliraj'}</span>
    </button>
  );
};

export default ButtonSim;