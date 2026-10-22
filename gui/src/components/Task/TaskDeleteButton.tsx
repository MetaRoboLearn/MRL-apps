import {useNavigate, useParams} from "@tanstack/react-router";
import {useMutation} from "@tanstack/react-query";
import {deleteTask} from "../../api/tasksApi.ts";
import {FaTrash} from "react-icons/fa";

const TaskDeleteButton = () => {
  const { taskId } = useParams({ strict: false });
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => navigate({ to: "/admin/tasks" }),
  });

  const handleDelete = () => {
    if (!taskId) return;
    if (!confirm("Jeste li sigurni da želite obrisati zadatak?")) return;
    deleteMutation.mutate(taskId);
  };

  if (!taskId) return null;

  return (
    <button onClick={handleDelete} disabled={deleteMutation.isPending}
            className={`bg-red-500 text-light-cyan-200 font-display font-bold text-xl pl-5 pr-8 py-2 rounded flex items-center ml-2 mr-6
          ${deleteMutation.isPending ? 'bg-red-700' : 'hover:cursor-pointer hover:bg-red-600'} transition`}>
      <FaTrash />
      <span className={'ml-4'}>{deleteMutation.isPending ? "Brisanje..." : "Obriši"}</span>
    </button>
  );
};

export default TaskDeleteButton;