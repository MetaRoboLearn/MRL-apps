import Editor, { OnMount } from '@monaco-editor/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import * as Monaco from 'monaco-editor'
import { CodeAnalysis, CodeElementRange } from '../../types/analyticsTypes.ts'

type CodeAnalysisViewerProps = {
  code: string
  analysis: CodeAnalysis
  template?: string | null
  expanded?: boolean
  visible?: boolean
}

// TODO: Making the legend configurable in the future could be useful
const LEGEND_ELEMENTS = [
  { type: 'variable_init', label: 'Inicijalizacija varijable' },
  { type: 'variable_use', label: 'Korištenje varijable' },
  { type: 'comment', label: 'Komentar' },
  { type: 'loop', label: 'Petlja' },
  { type: 'branching', label: 'Grananje' },
  { type: 'function_def', label: 'Definicija funkcije' },
  { type: 'builtin_call', label: 'Ugrađeni poziv' },
  { type: 'detect_object_call', label: 'Prepoznavanje objekata' },
  { type: 'detect_object_conf_call', label: 'Provjera pouzdanosti prepoznavanja' },
  { type: 'user_function_call', label: 'Korisnički poziv' },
  { type: 'list', label: 'Lista' },
  { type: 'tuple', label: 'N-torka' },
] as const

const elementCount = (analysis: CodeAnalysis, elementType: string, elements: CodeElementRange[]) => {
  const countKey = `${elementType}_count`
  const statsCount = analysis?.stats?.[countKey]
  const legacyCount = analysis?.counts?.[countKey]
  if (typeof statsCount === 'number') return statsCount
  if (typeof legacyCount === 'number') return legacyCount
  return elements.filter((element) => element.type === elementType).length
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

export function CodeAnalysisViewer({ code, analysis, template, expanded = false, visible = true }: CodeAnalysisViewerProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const styleDecorationsRef = useRef<string[]>([])
  const highlightDecorationsRef = useRef<string[]>([])
  const [selectedElement, setSelectedElement] = useState('all')
  const [editorReady, setEditorReady] = useState(false)
  const radioGroup = useId()
  const elements = useMemo(() => analysis?.code_elements || analysis?.elements || [], [analysis?.code_elements, analysis?.elements])
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
      const startLine = element.lineno ?? (typeof element.line === 'number' ? element.line : undefined)
      if (!startLine || startLine < 1 || startLine > model.getLineCount()) return []
      const endLineValue = element.end_lineno ?? (typeof element.end_line === 'number' ? element.end_line : startLine)
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
        {LEGEND_ELEMENTS.map(({ type, label }) => (
          <label key={type} className="flex items-center gap-2">
            <input type="radio" name={radioGroup} checked={selectedElement === type} onChange={() => setSelectedElement(type)} />
            <span>{label}</span>
            <span aria-label={`Broj pronađenih: ${elementCount(analysis, type, elements)}`} className={elementCount(analysis, type, elements) === 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
              ({elementCount(analysis, type, elements)})
            </span>
          </label>
        ))}
        {analysis?.error && <span className="block text-amber-700">Analiza koda naišla je na problem.</span>}
        {!analysis && <span className="block text-gray-500">Analiza koda nije dostupna.</span>}
        </div>
      </aside>
      {template && template !== code && (
        <p className="text-xs text-gray-500 lg:col-span-2">Predložak služi kao osnova za usporedbu; predani kod nije moguće uređivati.</p>
      )}
    </div>
  )
}