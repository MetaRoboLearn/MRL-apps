import Editor, { OnMount } from "@monaco-editor/react";
import {useEffect, useRef} from "react";
import * as monaco from "monaco-editor";
import {useCode} from "../../hooks/useCode.ts";
import {codeTheme} from "./CodeTheme.ts";

const CodePlayground = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { codeRef, setCode } = useCode();

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoInstance.editor.defineTheme("default", codeTheme);
    monacoInstance.editor.setTheme('default');
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry || !editorRef.current) return;
      const { width, height } = entry.contentRect;
      // Passing explicit dimensions forces Monaco to shrink as well as grow.
      // Calling layout() without args only ever expands — it never shrinks.
      editorRef.current.layout({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleCodeChange = (value: string | undefined) => {
    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setCode(value ?? '');
    }, 500);
  };

  useEffect(() => {
    return () => clearTimeout(debounceTimeout.current);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* absolute inset-0 ensures the container's size is always driven by
          the parent, never by Monaco itself — this is what allows height shrinking */}
      <div ref={containerRef} className="absolute inset-0">
        <Editor
          onMount={handleEditorDidMount}
          height="100%"
          defaultLanguage="python"
          theme="dark"
          value={codeRef.current ?? ''}
          onChange={handleCodeChange}
          keepCurrentModel={false}
          options={{
            fontSize: 20,
            lineNumbers: "on",
            minimap: { enabled: false },
            padding: { top: 10 },
          }}
        />
      </div>
    </div>
  );
};

export default CodePlayground;