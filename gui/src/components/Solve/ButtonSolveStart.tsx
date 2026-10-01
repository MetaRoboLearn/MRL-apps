import { FaPlay } from "react-icons/fa";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { createUserStartedTask } from "../../api/userStartedTaskApi.ts";

interface Props {
  activityTaskId: number;
  onError?: (error: Error) => void;
}

const ButtonSolveStart = ({ activityTaskId, onError }: Props) => {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: createUserStartedTask,
    onSuccess: () => {
      navigate({ to: '/solve/$activityTaskId', params: { activityTaskId: activityTaskId.toString() } });
    },
    onError,
  });

  return (
    <div>
      <button
        className="bg-emerald-500 text-light-cyan-50 font-display font-bold text-lg px-6 py-2 rounded flex items-center gap-3 hover:cursor-pointer hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(activityTaskId)}
      >
        <FaPlay size={14} />
        {mutation.isPending ? "Učitavanje..." : "Započni"}
      </button>
      {mutation.isError && <p role="alert" className="mt-1 max-w-56 text-sm text-red-700">Pokretanje zadatka nije uspjelo. Provjeri dostupnost i pokušaj ponovno.</p>}
    </div>
  );
};

export default ButtonSolveStart;