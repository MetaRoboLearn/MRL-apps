import {PropsWithChildren, useEffect, useMemo, useRef, useState} from "react";
import {MoveCommand, Position, Rotation} from "../types.ts";
import {VehicleContext} from "./Context.tsx";
import {useGrid} from "../hooks/useGrid.ts";
import * as THREE from "three";

const calcStartPosition = (start: number | null, sizeX: number, sizeZ: number): Position => {
  if (start === null) {
    return { x: 0, y: -2, z: 0 };
  }
  return {
    x: -Math.trunc(start / sizeZ) + Math.trunc(sizeX / 2),
    y: 0.1,
    z: -(start % sizeZ) + 2,
  };
};

const degToRad = (deg: number) => deg * Math.PI / 180;

// TODO - OH BOY, check this out i think this is bad, so much redundancy and useless code making it complicated for no reason
export const VehicleProvider = ({ children }: PropsWithChildren) => {
  const { start, sizeX, sizeZ, startRotationOffset } = useGrid();

  const startPosition = useMemo(
    () => calcStartPosition(start, sizeX, sizeZ),
    [start, sizeX, sizeZ]
  );

  const startRotation = useMemo<Rotation>(
    () => ({ x: 0, y: -Math.PI / 2 + degToRad(startRotationOffset), z: 0 }),
    [startRotationOffset]
  );

  const [position, setPosition] = useState<Position>(startPosition);
  const [rotation, setRotation] = useState<Rotation>(startRotation);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [moveQueue, setMoveQueue] = useState<MoveCommand[]>([]);
  const [currentMove, setCurrentMove] = useState<MoveCommand | null>(null);
  const [simFinished, setSimFinished] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(false);

  const vehicleRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    setPosition(startPosition);
    setRotation(startRotation);
  }, [startPosition, startRotation]);

  const queueMoves = (moves: MoveCommand[] | null) => {
    if (start === null || moves === null) return;
    setMoveQueue(moves);
    setIsMoving(true);
  };

  const reset = () => {
    setIsMoving(false);
    setMoveQueue([]);
    setHasRun(false);
    setPosition(startPosition);
    setRotation(startRotation);
    vehicleRef.current?.position.set(startPosition.x, startPosition.y, startPosition.z);
    vehicleRef.current?.rotation.set(startRotation.x, startRotation.y, startRotation.z);
  }

  return (
    <VehicleContext.Provider value={{
      vehicleRef, reset,
      startPosition, startRotation,
      position, setPosition,
      rotation, setRotation,
      isMoving, setIsMoving,
      moveQueue, queueMoves,
      currentMove, setCurrentMove,
      simFinished, setSimFinished,
      hasRun, setHasRun
    }}>
      {children}
    </VehicleContext.Provider>
  );
};