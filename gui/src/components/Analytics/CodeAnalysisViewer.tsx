import Editor, { OnMount } from '@monaco-editor/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import * as Monaco from 'monaco-editor'
import { TaskAnalysis } from '../../types/analyticsTypes.ts'
import { ElementStatusTooltip } from './ElementStatusTooltip.tsx'

type CodeAnalysisViewerProps = {
  code: string
  taskAnalysis: TaskAnalysis | null
  template?: string | null
  expanded?: boolean
  visible?: boolean
  showElementStatusTooltip?: boolean
}

const getTemplateLineIndexes = (code: string, template: string | null | undefined) => {
  const codeLines = code.split('\n')
  if (!template) return new Set<number>()

  const templateLines = template.split('\n').map((line) => line.trim())
  const normalizedCodeLines = codeLines.map((line) => line.trim())
  const matrix = Array.from({ length: templateLines.length + 1 }, () => (
    Array<number>(normalizedCodeLines.length + 1).fill(0)
  ))

  for (let templateIndex = 1; templateIndex <= templateLines.length; templateIndex += 1) {
    for (let codeIndex = 1; codeIndex <= normalizedCodeLines.length; codeIndex += 1) {
      matrix[templateIndex][codeIndex] = templateLines[templateIndex - 1] === normalizedCodeLines[codeIndex - 1]
        ? matrix[templateIndex - 1][codeIndex - 1] + 1
        : Math.max(matrix[templateIndex - 1][codeIndex], matrix[templateIndex][codeIndex - 1])
    }
  }

  const templateLineIndexes = new Set<number>()
  let templateIndex = templateLines.length
  let codeIndex = normalizedCodeLines.length
  while (templateIndex > 0 && codeIndex > 0) {
    if (templateLines[templateIndex - 1] === normalizedCodeLines[codeIndex - 1]) {
      templateLineIndexes.add(codeIndex)
      templateIndex -= 1
      codeIndex -= 1
    } else if (matrix[templateIndex - 1][codeIndex] >= matrix[templateIndex][codeIndex - 1]) {
      templateIndex -= 1
    } else {
      codeIndex -= 1
    }
  }

  return templateLineIndexes
}

export function CodeAnalysisViewer({ code, taskAnalysis, template, expanded = false, visible = true, showElementStatusTooltip = true }: CodeAnalysisViewerProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const styleDecorationsRef = useRef<string[]>([])
  const highlightDecorationsRef = useRef<string[]>([])
  const [selectedElement, setSelectedElement] = useState('all')
  const [editorReady, setEditorReady] = useState(false)
  const radioGroup = useId()
  const elements = useMemo(() => taskAnalysis
    ? taskAnalysis.expected_elements.flatMap((expected) => expected.evidence.map((evidence) => ({
      type: expected.element_id,
      lineno: evidence.lineno ?? undefined,
      end_lineno: evidence.end_lineno ?? undefined,
      col_offset: evidence.col_offset ?? undefined,
      end_col_offset: evidence.end_col_offset ?? undefined,
    })))
    : [], [taskAnalysis])
  const legendElements = useMemo(() => taskAnalysis?.expected_elements.map((element) => ({
    type: element.element_id,
    label: element.name,
    count: element.count,
    status: element.status,
    issues: [...new Set(element.evidence.flatMap((evidence) => evidence.issues.map((issue) => ({
      line: evidence.lineno,
      issue,
    }))))],
  })) ?? [], [taskAnalysis])
  const templateLineIndexes = useMemo(
    () => getTemplateLineIndexes(code, template),
    [code, template],
  )

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
    setEditorReady(true)
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !editorReady) return
    const model = editor.getModel()
    if (!model) return

    const styleRanges = code.split('\n').map((_, index) => {
      const line = index + 1
      const lineMaxColumn = model.getLineMaxColumn(line)
      const isTemplateLine = templateLineIndexes.has(line)
      return {
        range: new Monaco.Range(line, 1, line, lineMaxColumn),
        options: {
          inlineClassName: isTemplateLine ? 'analytics-template-code' : 'analytics-student-code',
        },
      }
    })

    styleDecorationsRef.current = editor.deltaDecorations(styleDecorationsRef.current, styleRanges)
    return () => {
      styleDecorationsRef.current = editor.deltaDecorations(styleDecorationsRef.current, [])
    }
  }, [code, editorReady, templateLineIndexes])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !editorReady || !visible) return
    const frame = window.requestAnimationFrame(() => editor.layout())
    return () => window.cancelAnimationFrame(frame)
  }, [editorReady, visible])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !editorReady) return
    const model = editor.getModel()
    if (!model) return

    const matchingElements = selectedElement === 'all'
      ? []
      : elements.filter((element) => element.type === selectedElement)

    const highlightRanges = matchingElements.flatMap((element) => {
      // `line` is a source-text excerpt in the analyzer response. Use the numeric AST coordinates.
      const startLine = element.lineno
      if (!startLine || startLine < 1 || startLine > model.getLineCount()) return []
      const endLineValue = element.end_lineno ?? startLine
      const endLine = Math.min(model.getLineCount(), Math.max(startLine, endLineValue))
      const startColumn = Math.min(model.getLineMaxColumn(startLine), Math.max(1, (element.col_offset ?? 0) + 1))
      const endColumn = Math.min(model.getLineMaxColumn(endLine), Math.max(startColumn + 1, (element.end_col_offset ?? startColumn) + 1))
      return [{
        range: new Monaco.Range(startLine, startColumn, endLine, endColumn),
        options: {
          inlineClassName: 'analytics-code-highlight',
          className: 'analytics-code-highlight-line',
        },
      }]
    })

    highlightDecorationsRef.current = editor.deltaDecorations(highlightDecorationsRef.current, highlightRanges)
    return () => {
      highlightDecorationsRef.current = editor.deltaDecorations(highlightDecorationsRef.current, [])
    }
  }, [editorReady, elements, selectedElement])

  useEffect(() => {
    if (selectedElement !== 'all' && !legendElements.some((element) => element.type === selectedElement)) {
      setSelectedElement('all')
    }
  }, [legendElements, selectedElement])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <div className={`overflow-hidden rounded-md border border-gray-200 ${expanded ? 'h-[45vh] min-h-80 lg:h-[32rem]' : 'h-80'}`}>
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onMount={handleMount}
          theme="vs-light"
          options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on', padding: { top: 12 } }}
        />
      </div>
      <aside className={`min-h-0 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-sm ${expanded ? 'h-[45vh] min-h-80 lg:h-[32rem]' : 'h-80'}`}>
        <h3 className="mb-3 font-semibold text-gray-700">Pronađeni elementi</h3>
        <div className="space-y-2">
        <label className="flex items-center gap-1">
          <input type="radio" name={radioGroup} checked={selectedElement === 'all'} onChange={() => setSelectedElement('all')} />
          Svi elementi
        </label>
        {legendElements.map(({ type, label, count, status, issues }) => (
          <div key={type} className="flex items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2">
              <input type="radio" name={radioGroup} checked={selectedElement === type} onChange={() => setSelectedElement(type)} />
              <span className="min-w-0 flex-1">{label}</span>
              <span aria-label={`Broj pronađenih: ${count}`} className={`${
                status === 'detected_with_issue'
                  ? 'text-amber-700'
                  : status === 'detected'
                    ? 'text-emerald-700'
                    : 'text-red-600'
              } shrink-0 font-semibold`}>
                ({count})
              </span>
            </label>
            {showElementStatusTooltip && <ElementStatusTooltip label={label} status={status} issues={issues} />}
          </div>
        ))}
        {taskAnalysis?.syntax_error && <span className="block text-red-700">Pogreška sintakse u retku {taskAnalysis.syntax_error.lineno ?? '—'}: {taskAnalysis.syntax_error.message}</span>}
        {taskAnalysis?.detection_method=="REGEX" && <span className="block text-gray-500">Zbog problema u detekciji, analiza koda provedena je alternativnom metodom te može biti neprecizna.</span>}
        {!taskAnalysis && <span className="block text-gray-500">Analiza koda nije dostupna.</span>}
        </div>
      </aside>
      {template && template !== code && (
        <p className="text-xs text-gray-500 lg:col-span-2">Predložak označen blijedim bojama služi kao osnova za usporedbu s kodom koji su učenici dodali.</p>
      )}
    </div>
  )
}