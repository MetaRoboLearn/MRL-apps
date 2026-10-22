import {useGrid} from "../../hooks/useGrid.ts";
import {useCode} from "../../hooks/useCode.ts";
import {useNavigate, useParams} from "@tanstack/react-router";
import {useTaskConfig} from "../../hooks/useTaskConfig.ts";
import {useMutation} from "@tanstack/react-query";
import {createTask, updateTask} from "../../api/tasksApi.ts";
import {FaPlus} from "react-icons/fa";
import {Barriers, Stickers, Sticker} from "../../types.ts";
import {isPackStickerKey} from "../../api/stickerPackApi.ts";

const TaskSaveButton = () => {
  const { taskId } = useParams({ strict: false });
  const { sizeX, sizeZ, barriers, stickers, start, finish, startRotationOffset, floorColor } = useGrid();
  const { code, blocks } = useCode();
  const { mode, title, description, isActive, modelPath } = useTaskConfig();
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => navigate({ to: "/admin/tasks" }),
  });

  const updateMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => navigate({ to: "/admin/tasks" }),
  });

  const handleSave = () => {
    const data = {
      title: title,
      description: description,
      size_x: sizeX,
      size_z: sizeZ,
      start,
      finish,
      rotation: startRotationOffset,
      stickers: stickers.map(({ index, sticker, rotation }) => ({
        index,
        sticker: isPackStickerKey(sticker as string) ? sticker : Stickers[sticker as Sticker].key,
        rotation
      })),
      barriers: [...barriers.entries()].map(([index, barrier]) => [
       index, Barriers[barrier].key
      ]),
      code,
      blocks,
      floor_color: floorColor,
      model_path: modelPath,
      active: isActive
    };

    if (mode === "create") {
      createMutation.mutate(data);
    } else {
      if (!taskId) return
      updateMutation.mutate({ id: taskId, ...data });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <button onClick={handleSave} disabled={isPending}
            className={`bg-emerald-500 text-light-cyan-200 font-display font-bold text-xl pl-5 pr-8 py-2 rounded flex items-center ml-2 mr-6
          ${false ? 'bg-emerald-700' : 'hover:cursor-pointer hover:bg-emerald-600'} transition`}>
      <FaPlus />
      <span className={'ml-4'}>{isPending ? "Spremanje..." : mode === "create" ? "Dodaj" : "Spremi"}</span>
    </button>
  );
};

export default TaskSaveButton;