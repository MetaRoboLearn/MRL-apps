import {createContext} from "react";
import {
  VehicleContextType,
  TaskConfigType,
  GridContextType,
  CodeContextType,
  UIContextType,
  ToastContextType, AuthContextType, ConsoleContextType,
} from "../types/contextTypes.ts";

export const AuthContext = createContext<AuthContextType | null>(null);
export const TaskConfigContext = createContext<TaskConfigType | null>(null);
export const GridContext = createContext<GridContextType | null>(null)
export const CodeContext = createContext<CodeContextType | null>(null)
export const VehicleContext = createContext<VehicleContextType | null>(null);
export const UIContext = createContext<UIContextType| null>(null)
export const ToastContext = createContext<ToastContextType | null>(null)
export const ConsoleContext = createContext<ConsoleContextType | null>(null);