import CodePlayground from "./CodePlayground.tsx";
import CodeHeader from "./CodeHeader.tsx";
import {useState} from "react";
import BlockPlayground from "../BlockEditor/BlockPlayground.tsx";
import {useTaskConfig} from "../../hooks/useTaskConfig.ts";
import {useCode} from "../../hooks/useCode.ts";
import CodeSnippets from "./CodeSnippets.tsx";
import CodeInstructions from "./CodeInstructions.tsx";
import CodeSideScreen from "./CodeSideScreen.tsx";

const CodeScreen = () => {
  const { mode } = useTaskConfig()
  const { modeRef: editorMode } = useCode()
  const [activeSnippets, setActiveSnippets] = useState<boolean>(false);
  const [activeInstructions, setActiveInstructions] = useState<boolean>(false);
  const [editor, setEditor] = useState<string>(editorMode.current)

  const updateEditor = (editor: string) => {
    setEditor(editor)
    editorMode.current = editor
  }

  const solveEditor = () => {
    return (
      <>
        {editorMode.current === "python" ? (
            <CodePlayground />
        ) : (
            <BlockPlayground />
        )}
      </>
    )
  }

  const editEditor = () => {
    return (
      <>
        {editor === 'python' ? (
            <CodePlayground />
        ) : (
            <BlockPlayground />
        )}
      </>
    )
  }

  return (
    <div className={'w-3/5 flex-center flex-col box-border'}>
      <CodeHeader activeS={activeSnippets}
                  setActiveS={setActiveSnippets}
                  activeI={activeInstructions}
                  setActiveI={setActiveInstructions}
                  setEditor={updateEditor} />
      <div className="bg-sunglow-400 w-full flex-1 pt-2 pb-2.5 z-20 relative">
        {mode === "solve" && solveEditor()}
        {mode !== "solve" && editEditor()}
        <CodeSideScreen active={activeSnippets || activeInstructions}>
          {activeSnippets && <CodeSnippets />}
          <CodeInstructions hidden={!activeInstructions} />
        </CodeSideScreen>
      </div>
    </div>
  );
};

export default CodeScreen;