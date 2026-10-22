import { FaPlay } from "react-icons/fa";
import { useNavigate } from "@tanstack/react-router";

interface Props {
  activityTaskId: number;
}

const ButtonSolveContinue = ({ activityTaskId }: Props) => {
  const navigate = useNavigate();

  return (
    <button
      className="bg-blue-500 text-light-cyan-50 font-display font-bold text-lg px-6 py-2 rounded flex items-center gap-3 hover:cursor-pointer hover:bg-blue-600 transition"
      onClick={() => navigate({ to: '/solve/$activityTaskId', params: { activityTaskId: activityTaskId.toString() } })}
    >
      <FaPlay size={14} />
      Nastavi
    </button>
  );
};

export default ButtonSolveContinue;