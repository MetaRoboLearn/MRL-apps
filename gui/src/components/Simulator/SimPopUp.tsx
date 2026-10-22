import {useCode} from "../../hooks/useCode.ts";
import {useTaskConfig} from "../../hooks/useTaskConfig.ts";
import {createLog, EventTypes} from "../../api/logApi.ts";

const SimPopUp = () => {
  const { getCurrentValue } = useCode();
  const { awaitingReview, setAwaitingReview, ustId } = useTaskConfig();

  const onYes = () => {
    void createLog(ustId, EventTypes.ROBOT_END_SUCC, getCurrentValue());
    setAwaitingReview(false);
  }

  const onNo = () => {
    void createLog(ustId, EventTypes.ROBOT_END_FAIL, getCurrentValue());
    setAwaitingReview(false);
  }

  return (
    <div className="font-display absolute bottom-44 w-full h-15 bg-turquoise-800 text-light-cyan-200 p-2 px-5 flex items-center justify-between z-50">
      <span className={"text-lg"}>Je li robot uspješno dosegnuo cilj?</span>

      <div className="flex gap-2">
        <button
          disabled={!awaitingReview}
          onClick={onYes}
          className="bg-emerald-500 text-white-smoke-200 font-display font-bold text-lg px-5 py-2 rounded flex items-center ml-2
          hover:cursor-pointer hover:bg-emerald-600 transition"
        >
          Da
        </button>

        <button
          disabled={!awaitingReview}
          onClick={onNo}
          className="bg-tomato-500 text-white-smoke-200 font-display font-bold text-lg px-5 py-2 rounded flex items-center ml-2
          hover:cursor-pointer hover:bg-tomato-600 transition"
        >
          Ne
        </button>
      </div>
    </div>
  );
};

export default SimPopUp;