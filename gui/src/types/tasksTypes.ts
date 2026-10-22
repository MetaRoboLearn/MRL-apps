import {UserBasic} from "./userTypes.ts";
import {Barrier} from "../types.ts";

export type GridState = {
  size_x: number;
  size_z: number;
  start: number | null;
  start_rotation: number;
  finish: number | null;
  barriers: number[];
  stickers: { index: number; sticker: string }[];
}

export type TaskMode = 'solve' | 'create' | 'edit';

export type TaskPreview = {
  id: number;
  title: string;
  description: string | null;
  size_x: number;
  size_z: number;
  created_at: string;
  created_by: number;
  active: boolean;
  creator: UserBasic;
};

export type Task = {
  id: number | null;
  title: string;
  description: string | null;
  size_x: number;
  size_z: number;
  start: number | null;
  rotation: number;
  finish: number | null;
  barriers: [number, keyof typeof Barrier][] | null;
  stickers: { index: number; sticker: string; rotation: number }[] | null;
  code: string | null;
  blocks: string | null;
  floor_color: string | null;
  model_path: string | null;
  active: boolean;
}

export type CreateTaskRequest = {
  title: string,
  description: string | null,
  size_x: number,
  size_z: number,
  start: number | null,
  rotation: number,
  finish: number | null,
  barriers: (string | number)[][] | null,
  stickers: { index: number; sticker: string; rotation: number }[] | null,
  code: string | null,
  blocks: string | null,
  floor_color: string | null,
  model_path: string | null,
  active: boolean
}