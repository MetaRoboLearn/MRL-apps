import { FaPlay } from "react-icons/fa";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { createUserStartedTask } from "../../api/userStartedTaskApi.ts";

interface Props {
  activityTaskId: number;
}

const ButtonSolveStart = ({ activityTaskId }: Props) => {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: createUserStartedTask,
    onSuccess: () => {
      navigate({ to: '/solve/$activityTaskId', params: { activityTaskId: activityTaskId.toString() } });
    },
  });

  return (
    <button
      className="bg-emerald-500 text-light-cyan-50 font-display font-bold text-lg px-6 py-2 rounded flex items-center gap-3 hover:cursor-pointer hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(activityTaskId)}
    >
      <FaPlay size={14} />
      {mutation.isPending ? "Učitavanje..." : "Započni"}
    </button>
  );
};

export default ButtonSolveStart;