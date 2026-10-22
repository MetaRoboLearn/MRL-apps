import { FaCheckSquare } from "react-icons/fa";
import { useMutation } from "@tanstack/react-query";
import { useTaskConfig } from "../../hooks/useTaskConfig.ts";
import { finishTask } from "../../api/userStartedTaskApi.ts";
import {useNavigate} from "@tanstack/react-router";

const TaskSubmitButton = () => {
  const navigate = useNavigate();
  const { ustId } = useTaskConfig();

  const mutation = useMutation({
    mutationFn: () => {
      if (!ustId) throw new Error("No active task");
      return finishTask(ustId);
    },
    onSuccess: () => navigate({to: '/'}),
    onError: (e) => console.error("Failed to finish task:", e),
  });

  return (
    <button
      disabled={!ustId || mutation.isPending}
      onClick={() => mutation.mutate()}
      className={`bg-turquoise-500 text-light-cyan-200 button-lg ml-8
        ${!ustId || mutation.isPending ? 'bg-turquoise-700 text-light-cyan-700' : 'hover:cursor-pointer hover:bg-turquoise-600'} transition`}
    >
      <FaCheckSquare size={22} />
      <span className="ml-4">{mutation.isPending ? "Šaljem..." : "Predaj i završi"}</span>
    </button>
  );
};

export default TaskSubmitButton;