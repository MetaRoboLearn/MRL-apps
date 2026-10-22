import {PropsWithChildren, useCallback, useEffect, useRef, useState} from "react";
import {CodeContext} from "./Context.tsx";
import {useTaskConfig} from "../hooks/useTaskConfig.ts";
import * as Blockly from "blockly";
import {pythonGenerator} from "blockly/python";
import {run_code} from "../api/robotApi.ts";
import {useConsole} from "../hooks/useConsole.ts";
import {useGrid} from "../hooks/useGrid.ts";

interface Props {
  init_code: string
  init_blocks: string
  editorMode?: string
  onSave?: (currentValue: string) => void;
}

export const CodeProvider = ({ init_code, init_blocks, editorMode, onSave, children }: PropsWithChildren<Props>) => {
  const { addLog } = useConsole()
  const { buildGridState } = useGrid();
  const { setSimFocused, ustId } = useTaskConfig();
  const [code, setCodeState] = useState<string>(init_code || '');
  const [blocks, setBlocksState] = useState<string>(init_blocks || '')

  const codeRef = useRef(init_code || '');
  const blocksRef = useRef(init_blocks || '');
  const modeRef = useRef(editorMode || '');

  const setCode = useCallback((code: string) => {
    setCodeState(code);
    codeRef.current = code;
  }, []);

  const setBlocks = useCallback((blocks: string) => {
    setBlocksState(blocks);
    blocksRef.current = blocks;
  }, []);

  const getCurrentCode = (): string => {
    if (modeRef.current === 'python') {
      return codeRef.current;
    } else {
      Blockly.hideChaff();
      const workspace = Blockly.getMainWorkspace();
      return pythonGenerator.workspaceToCode(workspace);
    }
  }

  const getCurrentValue = (): string => {
    if (modeRef.current === 'python') {
      return codeRef.current;
    } else {
      return blocksRef.current;
    }
  }

  const runCode = async () => {
    setSimFocused(false);
    const code = getCurrentCode();
    const value = getCurrentValue();
    const compiled = await run_code(code, value, ustId, buildGridState());
    if (compiled.error) {
      addLog("ERROR", compiled.error);
      return null;
    }
    if (compiled.output) {
      addLog("OUTPUT", compiled.output);
    }
    return { steps: compiled.steps, finished: compiled.finished };
  }

  useEffect(() => {
    if (!onSave) return;

    const timeout = setTimeout(() => {
      onSave(getCurrentValue());
    }, 500);

    return () => clearTimeout(timeout);
  }, [code, onSave]);

  useEffect(() => {
    if (!onSave) return;
    onSave(getCurrentValue());
    return;
  }, [blocks, onSave]);

  return (
    <CodeContext.Provider value={{
      code, setCode, codeRef,
      blocks, setBlocks, blocksRef,
      modeRef,
      getCurrentCode, getCurrentValue,
      runCode,
    }}>
      {children}
    </CodeContext.Provider>
  );
};
