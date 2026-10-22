import {Texture} from "three";
import {ReactNode, RefObject} from "react";
import * as THREE from "three";
import {Barrier, MoveCommand, Position, Rotation, Sticker, TileType} from "../types.ts";
import {GridState, TaskMode} from "./tasksTypes.ts";
import {CurrentUser} from "./userTypes.ts";
import {LogEntry} from "./consoleTypes.ts";

export type ModelOffset = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

export type ModelConfig = {
  id: string;
  name: string;
  path: string;
  offset: ModelOffset;
};

export type ModelsConfig = {
  default_path: string;
  models: ModelConfig[];
};

export interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface TaskConfigType {
  ustId: number | null;
  mode: TaskMode;
  taskPreview: string | null | undefined;
  setMode: (taskMode: TaskMode) => void;
  selectedType: TileType;
  setSelectedType: (selectedType: TileType) => void;
  selectedSticker: Sticker | string | null;
  setSelectedSticker: (selectedPlaceable: Sticker | string | null) => void;
  selectedBarrier: Barrier;
  setSelectedBarrier: (selectedBarrier: Barrier) => void;
  selectedRotation: number;
  rotateBy90: () => void;
  simFocused: boolean;
  setSimFocused: (simFocused: boolean) => void;
  camMode: boolean;
  setCamMode: (camMode: boolean) => void;
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
  barriers3D: boolean;
  setBarriers3D: (barriers3D: boolean) => void;
  animationSpeed: number;
  setAnimationSpeed: (animationSpeed: number) => void;
  textures: Record<Sticker, Texture>;
  loadTextures: () => void;
  packTextures: Record<string, Texture>;
  loadPackTextures: (packName: string) => void;
  barrierTextures: Record<Barrier, Texture>;
  loadBarrierTextures: () => void;
  robotUrl: string | null;
  setRobotUrl: (robotUrl: string | null) => void;
  awaitingReview: boolean;
  setAwaitingReview: (awaitingReview: boolean) => void;
  isLogged: boolean;
  setIsLogged: (isLogged: boolean) => void;
  hasRobotAccess: boolean;
  setHasRobotAccess: (hasRobotAccess: boolean) => void;
  isActive: boolean;
  setIsActive: (isActive: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string | null;
  setDescription: (description: string | null) => void;
  instructions: string;
  selectedRobotId: string | null;
  setSelectedRobotId: (robotId: string | null) => void;
  modelPath: string | null;
  setModelPath: (modelPath: string | null) => void;
  modelsConfig: ModelsConfig | null;
}

export interface VehicleContextType {
  vehicleRef: RefObject<THREE.Object3D | null>;
  reset: () => void;
  startPosition: Position;
  startRotation: Rotation;
  position: Position;
  setPosition: (positions: Position) => void;
  rotation: Rotation;
  setRotation: (rotation: Rotation) => void;
  isMoving: boolean;
  setIsMoving: (isMoving: boolean) => void;
  moveQueue: MoveCommand[];
  queueMoves: (moves: MoveCommand[] | null) => void;
  currentMove: MoveCommand | null;
  setCurrentMove: (currentMove: MoveCommand | null) => void;
  simFinished: boolean;
  setSimFinished: (simFinished: boolean) => void;
  hasRun: boolean,
  setHasRun: (hasRun: boolean) => void;
}

export interface GridContextType {
  sizeX: number;
  setSizeX: (sizeX: number) => void;
  sizeZ: number;
  setSizeZ: (sizeZ: number) => void;
  start: number | null;
  setStart: (start: number | null) => void;
  startRotationOffset: number;
  setStartRotationOffset: (startRotation: number) => void;
  finish: number | null;
  setFinish: (finish: number | null) => void;
  barriers: Map<number, Barrier>;
  setBarriers: (barriers: Map<number, Barrier>) => void;
  stickers: { index: number, sticker: Sticker | string, rotation: number }[];
  setStickers: (stickers: { index: number, sticker: Sticker | string, rotation: number }[]) => void;
  buildGridState: () => GridState;
  floorColor: string | null;
  setFloorColor: (color: string | null) => void;
}

export interface CodeContextType {
  code: string;
  setCode: (code: string) => void;
  codeRef: RefObject<string>;
  blocks: string;
  setBlocks: (code: string) => void;
  blocksRef: RefObject<string>;
  modeRef: RefObject<string>;
  getCurrentCode: () => string;
  getCurrentValue: () => string;
  runCode: () => Promise<{ steps: MoveCommand[]; finished: boolean } | null>;
}

export interface UIContextType {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  modalHeader: ReactNode;
  setModalHeader: (header: ReactNode) => void;
  modalBody: ReactNode;
  setModalBody: (body: ReactNode) => void;
  modalFooter: ReactNode;
  setModalFooter: (footer: ReactNode) => void;
  showModal: (header: string, body: ReactNode, footer?: ReactNode) => void;
}

export interface ToastContextType {
  showToast: (message: string) => void;
  closeToast: (id: number) => void;
}

export interface ConsoleContextType {
  logs: LogEntry[];
  addLog: (level: LogEntry["level"], message: string) => void;
  clearLogs: () => void;
}