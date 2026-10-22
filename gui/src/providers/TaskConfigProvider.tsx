import {PropsWithChildren, useEffect, useState} from "react";
import {TaskConfigContext} from "./Context.tsx";
import {Barrier, Barriers, Sticker, Stickers, TileType} from "../types.ts";
import {Texture, TextureLoader} from "three";
import {Task, TaskMode} from "../types/tasksTypes.ts";
import {UserStartedTask} from "../types/userStartedTasksTypes.ts";
import {isPackStickerKey, packStickerUrl} from "../api/stickerPackApi.ts";
import {ModelsConfig} from "../types/contextTypes.ts";

interface Props {
  task: Task
  mode?: TaskMode
  ust?: UserStartedTask
}

export const TaskConfigProvider = ({ust, task, mode, children }: PropsWithChildren<Props>) => {
  // Grid editing options
  const [taskMode, setTaskMode] = useState<TaskMode>(mode || 'solve') // this is going to be true only while editing/creaing task
  const [selectedType, setSelectedType] = useState<TileType>(TileType.GROUND);
  const [selectedSticker, setSelectedSticker] = useState<Sticker | string | null>(null);
  const [selectedBarrier, setSelectedBarrier] = useState<Barrier>(Barrier.TREES);
  const [selectedRotation, setSelectedRotation] = useState<number>(0);

  // Task specific options
  const [title, setTitle] = useState<string>(task.title)
  const [description, setDescription] = useState<string | null>(task.description)
  const [isActive, setIsActive] = useState<boolean>(task.active);
  const [isLogged, setIsLogged] = useState<boolean>(ust?.activity_task.is_logged || false);
  const [hasRobotAccess, setHasRobotAccess] = useState<boolean>(ust?.activity_task.allows_robot || false)
  const instructions = ust?.activity_task.instructions || '';

  // Sync task metadata when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setIsActive(task.active);
  }, [task.title, task.description, task.active]);

  // Task solving specific options
  const ustId: number | null = ust?.id ?? null;

  // Generic options
  const [camMode, setCamMode] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [barriers3D, setBarriers3D] = useState<boolean>(false);
  const [simFocused, setSimFocused] = useState<boolean>(false);
  const [animationSpeed, setSpeed] = useState<number>(0.07);

  // TODO - check this out maybe it isnt needed
  const [textures, setTextures] = useState<Record<Sticker, Texture>>({} as Record<Sticker, Texture>);
  const [barrierTextures, setBarrierTextures] = useState<Record<Barrier, Texture>>({} as Record<Barrier, Texture>);
  const [packTextures, setPackTextures] = useState<Record<string, Texture>>({});

  // Robot related options
  // TODO - replace robot url with call from broker api and dropdown
  const [robotUrl, setRobotUrl] = useState<string | null>(null);
  const [awaitingReview, setAwaitingReview] = useState<boolean>(false);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  // Model related options
  const [modelPath, setModelPath] = useState<string | null>(task.model_path ?? null);
  const [modelsConfig, setModelsConfig] = useState<ModelsConfig | null>(null);

  // Sync modelPath when task.model_path changes
  useEffect(() => {
    setModelPath(task.model_path ?? null);
  }, [task.model_path]);

  useEffect(() => {
    fetch('/models/models.json', { cache: 'no-store' })
      .then(r => r.json())
      .then((cfg: ModelsConfig) => setModelsConfig(cfg))
      .catch(e => console.error('Failed to load models config', e));
  }, []);

  const setAnimationSpeed = (speed: number) => {
    // max 0.1, min 0.02, default 0.4
    setSpeed(speed / 1000);
  }

  const rotateBy90 = () => {
    const new_rot = selectedRotation + 90;
    if (new_rot >= 360)
      setSelectedRotation(0)
    else
      setSelectedRotation(new_rot)
  }

  // Load only standard (enum) sticker textures that appear in this task (task-dependent loading).
  // Pack sticker textures are handled separately via loadPackTextures.
  const loadTextures = () => {
    const loader = new TextureLoader();
    const textureMap: Record<string, Texture> = {};

    // Collect non-pack sticker identifiers used in the task.
    // Saved data stores enum KEY names (e.g. "RESTAURANT"), but Stickers record
    // is indexed by enum VALUES (e.g. 'restaurant'), so convert before comparing.
    const taskStickerValues = new Set<string>(
      (task.stickers || [])
        .filter(s => !isPackStickerKey(s.sticker))
        .map(s => (Sticker[s.sticker as keyof typeof Sticker] as string | undefined) ?? s.sticker)
    );

    // Only load entries that match a sticker used in the task
    const entries = Object.entries(Stickers).filter(([key]) => taskStickerValues.has(key));

    if (entries.length > 0) {
      let loadedCount = 0;
      entries.forEach(([key, sticker]) => {
        loader.load(sticker.image, (texture) => {
          textureMap[key] = texture;
          loadedCount++;
          if (loadedCount === entries.length) {
            setTextures(prev => ({ ...prev, ...textureMap } as Record<Sticker, Texture>));
          }
        });
      });
    }

    // Eagerly load pack sticker textures already in the task (runs regardless of enum stickers)
    const packKeys = (task.stickers || []).map(s => s.sticker).filter(isPackStickerKey);
    if (packKeys.length > 0) {
      const packMap: Record<string, Texture> = {};
      let packLoaded = 0;
      packKeys.forEach(key => {
        loader.load(packStickerUrl(key), (texture) => {
          packMap[key] = texture;
          packLoaded++;
          if (packLoaded === packKeys.length) {
            setPackTextures(prev => ({ ...prev, ...packMap }));
          }
        });
      });
    }
  };

  const loadBarrierTextures = () => {
    const loader = new TextureLoader();
    const textureMap: Record<string, Texture> = {};
    const entries = Object.entries(Barriers);
    let loadedCount = 0;
    const total = entries.length;

    entries.forEach(([key, barrier]) => {
      loader.load(barrier.image, (texture) => {
        textureMap[key] = texture;
        loadedCount++;
        if (loadedCount === total) {
          setBarrierTextures(textureMap);
        }
      });
    });
  }

  /** Preload all textures for a backend sticker pack (called when admin opens a pack tab). */
  const loadPackTextures = (packName: string) => {
    // Find stickers for this pack from existing packTextures keys — we rely on URLs instead
    // since the pack metadata is fetched separately in useStickerPacks.
    // This function accepts a list-of-urls approach via a helper fetch.
    fetch(`/api/stickers/pack/${encodeURIComponent(packName)}`, { credentials: 'include' })
      .then(r => r.json())
      .then((stickers: { key: string; url: string }[]) => {
        const loader = new TextureLoader();
        stickers.forEach(({ key, url }) => {
          if (packTextures[key]) return;   // already loaded
          loader.load(url, texture => {
            setPackTextures(prev => ({ ...prev, [key]: texture }));
          });
        });
      })
      .catch(e => console.error(`Failed to load textures for pack "${packName}"`, e));
  };

  useEffect(() => {
    const raw = localStorage.getItem('robotUrl');
    if (!raw) setRobotUrl(null);

    setRobotUrl(raw);
  }, []);

  return (
    <TaskConfigContext.Provider value={{
      ustId,
      mode: taskMode, setMode: setTaskMode,
      taskPreview: ust?.activity_task.preview,
      selectedType, setSelectedType,
      selectedSticker, setSelectedSticker,
      selectedBarrier, setSelectedBarrier,
      selectedRotation, rotateBy90,
      camMode, setCamMode,
      editMode, setEditMode,
      barriers3D, setBarriers3D,
      simFocused, setSimFocused,
      animationSpeed, setAnimationSpeed,
      textures, loadTextures,
      barrierTextures, loadBarrierTextures,
      packTextures, loadPackTextures,
      robotUrl, setRobotUrl,
      awaitingReview, setAwaitingReview,
      selectedRobotId, setSelectedRobotId,
      isLogged, setIsLogged,
      hasRobotAccess, setHasRobotAccess,
      isActive, setIsActive,
      title, setTitle,
      description, setDescription,
      instructions,
      modelPath, setModelPath,
      modelsConfig,
    }}>
      {children}
    </TaskConfigContext.Provider>
  );
};