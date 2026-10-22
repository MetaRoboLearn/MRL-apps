import { useCallback, useMemo } from 'react'
import {
  BaseEditor,
  createEditor,
  Descendant,
  Editor,
  Element as SlateElement,
  Node,
  Path,
  Point,
  Range,
  Transforms,
} from 'slate'
import {
  Editable,
  ReactEditor,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  useSlate,
  useSlateSelector,
  useSlateStatic,
  useReadOnly,
  withReact,
} from 'slate-react'
import { HistoryEditor, withHistory } from 'slate-history'

// ─── Custom Types ─────────────────────────────────────────────────────────────

export type CustomText = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export type ParagraphElement    = { type: 'paragraph';       children: CustomText[] }
export type HeadingOneElement   = { type: 'heading-one';     children: CustomText[] }
export type HeadingTwoElement   = { type: 'heading-two';     children: CustomText[] }
export type ListItemElement     = { type: 'list-item';       children: CustomText[] }
export type BulletedListElement = { type: 'bulleted-list';   children: ListItemElement[] }
export type NumberedListElement = { type: 'numbered-list';   children: ListItemElement[] }
export type TableCellElement    = { type: 'table-cell';      children: CustomText[] }
export type TableRowElement     = { type: 'table-row';       children: TableCellElement[] }
export type TableElement        = { type: 'table';           children: TableRowElement[] }

export type CheckListItemElement = { type: 'check-list-item'; checked: boolean; children: CustomText[] }

export type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | ListItemElement
  | BulletedListElement
  | NumberedListElement
  | TableCellElement
  | TableRowElement
  | TableElement
  | CheckListItemElement

// Module augmentation — makes Slate's types aware of our custom nodes/marks,
// eliminating the need for any type assertions in the rest of the file.
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement
    Text: CustomText
  }
}

// ─── Format Types ─────────────────────────────────────────────────────────────

type MarkFormat      = keyof Omit<CustomText, 'text'>
type ListFormat      = 'bulleted-list' | 'numbered-list'
type ToggleableBlock = 'paragraph' | 'heading-one' | 'heading-two' | 'check-list-item' | ListFormat

const LIST_FORMATS: ListFormat[] = ['bulleted-list', 'numbered-list']

const isListFormat = (format: ToggleableBlock): format is ListFormat =>
  LIST_FORMATS.includes(format as ListFormat)

// ─── Empty value export ───────────────────────────────────────────────────────

export const EMPTY_RICH_TEXT: Descendant[] = [
  { type: 'paragraph', children: [{ text: '' }] },
]

// ─── Mark helpers ─────────────────────────────────────────────────────────────

const isMarkActive = (editor: Editor, format: MarkFormat): boolean => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

const toggleMark = (editor: Editor, format: MarkFormat): void => {
  if (isMarkActive(editor, format)) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

// ─── Block helpers ────────────────────────────────────────────────────────────

const isBlockActive = (editor: Editor, format: ToggleableBlock): boolean => {
  const { selection } = editor
  if (!selection) return false
  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
    })
  )
  return !!match
}

const toggleBlock = (editor: Editor, format: ToggleableBlock): void => {
  const isActive = isBlockActive(editor, format)

  // Always unwrap any existing list wrapper first
  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      isListFormat(n.type as ToggleableBlock),
    split: true,
  })

  if (isActive) {
    // Deactivate: revert to plain paragraph
    const props: Partial<ParagraphElement> = { type: 'paragraph' }
    Transforms.setNodes(editor, props)
  } else if (isListFormat(format)) {
    // Activate list: set children to list-item, then wrap in list container
    const itemProps: Partial<ListItemElement> = { type: 'list-item' }
    Transforms.setNodes(editor, itemProps)
    const wrapper: BulletedListElement | NumberedListElement =
      format === 'bulleted-list'
        ? { type: 'bulleted-list', children: [] }
        : { type: 'numbered-list', children: [] }
    Transforms.wrapNodes(editor, wrapper)
  } else if (format === 'heading-one') {
    const props: Partial<HeadingOneElement> = { type: 'heading-one' }
    Transforms.setNodes(editor, props)
  } else if (format === 'heading-two') {
    const props: Partial<HeadingTwoElement> = { type: 'heading-two' }
    Transforms.setNodes(editor, props)
  } else if (format === 'check-list-item') {
    const props: Partial<CheckListItemElement> = { type: 'check-list-item', checked: false }
    Transforms.setNodes(editor, props)
  }
}

// ─── Checklist plugin ────────────────────────────────────────────────────────

const withChecklists = (editor: Editor & ReactEditor & HistoryEditor) => {
  const { deleteBackward } = editor

  editor.deleteBackward = (...args) => {
    const { selection } = editor
    if (selection && Range.isCollapsed(selection)) {
      const [match] = Array.from(
        Editor.nodes(editor, {
          match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'check-list-item',
        })
      )
      if (match) {
        const [, path] = match
        const start = Editor.start(editor, path)
        if (Point.equals(selection.anchor, start)) {
          const props: Partial<ParagraphElement> = { type: 'paragraph' }
          Transforms.setNodes(editor, props, {
            match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'check-list-item',
          })
          return
        }
      }
    }
    deleteBackward(...args)
  }

  return editor
}

// ─── Table helpers ────────────────────────────────────────────────────────────

const makeCell = (): TableCellElement => ({
  type: 'table-cell',
  children: [{ text: '' }],
})

const makeRow = (numCols: number): TableRowElement => ({
  type: 'table-row',
  children: Array.from({ length: numCols }, makeCell),
})

/** Returns context about the table the cursor is currently inside, or null. */
const getTableContext = (editor: Editor) => {
  const cellEntries = Array.from(
    Editor.nodes(editor, {
      match: n =>
        !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'table-cell',
    })
  )
  if (cellEntries.length === 0) return null

  const [, cellPath] = cellEntries[0]
  const rowPath   = Path.parent(cellPath)
  const tablePath = Path.parent(rowPath)

  const tableNode = Node.get(editor, tablePath)
  const rowNode   = Node.get(editor, rowPath)

  if (!SlateElement.isElement(tableNode) || tableNode.type !== 'table') return null
  if (!SlateElement.isElement(rowNode)   || rowNode.type !== 'table-row') return null

  return {
    cellPath,
    rowPath,
    tablePath,
    tableNode, // TableElement
    rowNode,   // TableRowElement
    rowIndex: cellPath[cellPath.length - 2],
    colIndex: cellPath[cellPath.length - 1],
    numRows: tableNode.children.length,
    numCols: rowNode.children.length,
  }
}

const exitTable = (editor: Editor): void => {
  const ctx = getTableContext(editor)
  if (!ctx) return
  const afterTable = Path.next(ctx.tablePath)
  Transforms.insertNodes(
    editor,
    { type: 'paragraph', children: [{ text: '' }] },
    { at: afterTable }
  )
  Transforms.select(editor, afterTable)
}

const insertTable = (editor: Editor, numRows = 2, numCols = 2): void => {
  const table: TableElement = {
    type: 'table',
    children: Array.from({ length: numRows }, () => makeRow(numCols)),
  }
  // Insert the table then add a trailing paragraph so the cursor can leave
  Transforms.insertNodes(editor, table)
  Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] })
}

const addRowBelow = (editor: Editor): void => {
  const ctx = getTableContext(editor)
  if (!ctx) return
  const newRow = makeRow(ctx.numCols)
  Transforms.insertNodes(editor, newRow, { at: Path.next(ctx.rowPath) })
}

const addColumnRight = (editor: Editor): void => {
  const ctx = getTableContext(editor)
  if (!ctx) return

  // Insert a new cell into every row at colIndex + 1
  Editor.withoutNormalizing(editor, () => {
    ctx.tableNode.children.forEach((_row, rowIndex) => {
      const newCellPath: Path = [...ctx.tablePath, rowIndex, ctx.colIndex + 1]
      Transforms.insertNodes(editor, makeCell(), { at: newCellPath })
    })
  })
}

const deleteRow = (editor: Editor): void => {
  const ctx = getTableContext(editor)
  if (!ctx || ctx.numRows <= 1) return
  Transforms.removeNodes(editor, { at: ctx.rowPath })
}

const deleteColumn = (editor: Editor): void => {
  const ctx = getTableContext(editor)
  if (!ctx || ctx.numCols <= 1) return

  // Remove the cell at colIndex from every row (iterate in reverse to keep paths stable)
  Editor.withoutNormalizing(editor, () => {
    for (let rowIndex = ctx.numRows - 1; rowIndex >= 0; rowIndex--) {
      const cellPath: Path = [...ctx.tablePath, rowIndex, ctx.colIndex]
      Transforms.removeNodes(editor, { at: cellPath })
    }
  })
}

/** Navigate to the next/previous table cell on Tab / Shift+Tab, or exit on Enter in last cell. */
const handleTableKey = (
  editor: Editor,
  event: React.KeyboardEvent<HTMLDivElement>
): boolean => {
  const ctx = getTableContext(editor)
  if (!ctx) return false

  const { rowIndex, colIndex, numRows, numCols, tablePath } = ctx

  // Enter in the last cell of the last row → exit table below
  if (event.key === 'Enter' && rowIndex === numRows - 1 && colIndex === numCols - 1) {
    event.preventDefault()
    exitTable(editor)
    return true
  }

  if (event.key !== 'Tab') return false
  event.preventDefault()

  if (!event.shiftKey) {
    if (colIndex < numCols - 1) {
      Transforms.select(editor, [...tablePath, rowIndex, colIndex + 1])
    } else if (rowIndex < numRows - 1) {
      Transforms.select(editor, [...tablePath, rowIndex + 1, 0])
    } else {
      // Last cell, last row — add a new row
      addRowBelow(editor)
      Transforms.select(editor, [...tablePath, rowIndex + 1, 0])
    }
  } else {
    if (colIndex > 0) {
      Transforms.select(editor, [...tablePath, rowIndex, colIndex - 1])
    } else if (rowIndex > 0) {
      const prevRow = ctx.tableNode.children[rowIndex - 1]
      Transforms.select(editor, [...tablePath, rowIndex - 1, prevRow.children.length - 1])
    }
  }

  return true
}

// ─── Toolbar Buttons ──────────────────────────────────────────────────────────

type ToolbarButtonProps = {
  active?: boolean
  onMouseDown: (e: React.MouseEvent) => void
  title?: string
  children: React.ReactNode
  className?: string
}

function ToolbarButton({ active, onMouseDown, title, children, className = '' }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function MarkButton({ format, label, title }: { format: MarkFormat; label: string; title: string }) {
  const editor = useSlate()
  return (
    <ToolbarButton
      active={isMarkActive(editor, format)}
      title={title}
      onMouseDown={e => { e.preventDefault(); toggleMark(editor, format) }}
    >
      {label}
    </ToolbarButton>
  )
}

function BlockButton({ format, label, title }: { format: ToggleableBlock; label: string; title: string }) {
  const editor = useSlate()
  return (
    <ToolbarButton
      active={isBlockActive(editor, format)}
      title={title}
      onMouseDown={e => { e.preventDefault(); toggleBlock(editor, format) }}
    >
      {label}
    </ToolbarButton>
  )
}

/** Only renders when the cursor is inside a table cell. */
function TableToolbar() {
  const editor = useSlate()

  const isInTable = useSlateSelector(ed => {
    if (!ed.selection) return false
    const [match] = Editor.nodes(ed, {
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'table-cell',
    })
    return !!match
  })

  if (!isInTable) return null

  return (
    <div className="flex flex-wrap gap-1 px-2 py-1.5 bg-blue-50 border-b border-blue-200 text-xs">
      <span className="text-blue-500 font-medium self-center mr-1">Table:</span>
      <ToolbarButton title="Add row below" onMouseDown={e => { e.preventDefault(); addRowBelow(editor) }}>
        + Row
      </ToolbarButton>
      <ToolbarButton title="Add column right" onMouseDown={e => { e.preventDefault(); addColumnRight(editor) }}>
        + Col
      </ToolbarButton>
      <ToolbarButton title="Delete current row" onMouseDown={e => { e.preventDefault(); deleteRow(editor) }}
        className="text-red-600 hover:bg-red-50 border-red-200">
        − Row
      </ToolbarButton>
      <ToolbarButton title="Delete current column" onMouseDown={e => { e.preventDefault(); deleteColumn(editor) }}
        className="text-red-600 hover:bg-red-50 border-red-200">
        − Col
      </ToolbarButton>
      <ToolbarButton title="Exit table (or press Enter in last cell)" onMouseDown={e => { e.preventDefault(); exitTable(editor) }}>
        ↓ Exit
      </ToolbarButton>
    </div>
  )
}

function Toolbar() {
  const editor = useSlate()
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
      <MarkButton format="bold"      label="B"      title="Bold (Ctrl+B)" />
      <MarkButton format="italic"    label="I"      title="Italic (Ctrl+I)" />
      <MarkButton format="underline" label="U"      title="Underline (Ctrl+U)" />
      <div className="w-px bg-gray-300 mx-1" />
      <BlockButton format="heading-one"   label="H1"     title="Heading 1" />
      <BlockButton format="heading-two"   label="H2"     title="Heading 2" />
      <div className="w-px bg-gray-300 mx-1" />
      <BlockButton format="bulleted-list" label="• List"  title="Bullet list" />
      <BlockButton format="numbered-list" label="1. List" title="Numbered list" />
      <BlockButton format="check-list-item" label="☑ Check" title="Checklist" />
      <div className="w-px bg-gray-300 mx-1" />
      <ToolbarButton
        title="Insert 2×2 table"
        onMouseDown={e => { e.preventDefault(); insertTable(editor) }}
      >
        ⊞ Table
      </ToolbarButton>
    </div>
  )
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function CheckListItem({ attributes, children, element }: RenderElementProps) {
  const editor = useSlateStatic()
  const readOnly = useReadOnly()
  if (element.type !== 'check-list-item') return null
  const { checked } = element
  return (
    <div {...attributes} className="flex items-center gap-2 my-1">
      <span contentEditable={false} className="flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          className="w-4 h-4 accent-blue-500 cursor-pointer disabled:cursor-default"
          onChange={e => {
            const path = ReactEditor.findPath(editor, element)
            const props: Partial<CheckListItemElement> = { checked: e.target.checked }
            Transforms.setNodes(editor, props, { at: path })
          }}
        />
      </span>
      <span
        contentEditable={!readOnly}
        suppressContentEditableWarning
        className={`flex-1 outline-none ${checked ? 'line-through text-gray-400' : ''}`}
      >
        {children}
      </span>
    </div>
  )
}

function Element({ attributes, children, element }: RenderElementProps) {
  switch (element.type) {
    case 'heading-one':
      return <h1 {...attributes} className="text-xl font-bold mt-2 mb-1">{children}</h1>
    case 'heading-two':
      return <h2 {...attributes} className="text-lg font-semibold mt-2 mb-1">{children}</h2>
    case 'bulleted-list':
      return <ul {...attributes} className="list-disc list-inside pl-2 my-1">{children}</ul>
    case 'numbered-list':
      return <ol {...attributes} className="list-decimal list-inside pl-2 my-1">{children}</ol>
    case 'list-item':
      return <li {...attributes}>{children}</li>
    case 'table':
      return (
        <table {...attributes} className="border-collapse w-full my-2 text-sm">
          <tbody>{children}</tbody>
        </table>
      )
    case 'table-row':
      return <tr {...attributes}>{children}</tr>
    case 'table-cell':
      return (
        <td {...attributes} className="border border-gray-300 px-3 py-2 align-top min-w-[80px]">
          {children}
        </td>
      )
    case 'check-list-item':
      return <CheckListItem attributes={attributes} element={element} children={children} />
    default:
      return <p {...attributes} className="my-1">{children}</p>
  }
}

function Leaf({ attributes, children, leaf }: RenderLeafProps) {
  // leaf is CustomText — all properties are typed, no assertions needed
  let el = <>{children}</>
  if (leaf.bold)      el = <strong>{el}</strong>
  if (leaf.italic)    el = <em>{el}</em>
  if (leaf.underline) el = <u>{el}</u>
  return <span {...attributes}>{el}</span>
}

// ─── Main Component ───────────────────────────────────────────────────────────

type RichTextEditorBase = {
  /** JSON-serialized Slate document. Pass an empty string for a blank editor. */
  value: string
  placeholder?: string
  minHeight?: string
  className?: string
}

type EditableEditorProps = RichTextEditorBase & {
  readOnly?: false
  onChange: (value: string) => void
}

type ReadOnlyEditorProps = RichTextEditorBase & {
  readOnly: true
  onChange?: never
}

export type RichTextEditorProps = EditableEditorProps | ReadOnlyEditorProps

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  readOnly = false,
  minHeight = '180px',
  className = '',
}: RichTextEditorProps) {
  // The editor instance must be stable across re-renders.
  const editor = useMemo(() => withChecklists(withHistory(withReact(createEditor()))), [])

  // Only parse on mount — Slate owns its own state after that.
  const initialValue: Descendant[] = useMemo(() => {
    if (!value) return EMPTY_RICH_TEXT
    try {
      return JSON.parse(value) as Descendant[]
    } catch {
      return EMPTY_RICH_TEXT
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const renderElement = useCallback((props: RenderElementProps) => <Element {...props} />, [])
  const renderLeaf    = useCallback((props: RenderLeafProps)    => <Leaf    {...props} />, [])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Table key handling takes priority
    if (handleTableKey(editor, event)) return

    if (!event.ctrlKey && !event.metaKey) return
    switch (event.key) {
      case 'b': event.preventDefault(); toggleMark(editor, 'bold');      break
      case 'i': event.preventDefault(); toggleMark(editor, 'italic');    break
      case 'u': event.preventDefault(); toggleMark(editor, 'underline'); break
    }
  }

  return (
    <Slate
      editor={editor}
      initialValue={initialValue}
      onChange={val => onChange && onChange(JSON.stringify(val))}
    >
      <div className={`flex flex-col ${className}`}>
        {!readOnly && (
          <>
            <Toolbar />
            <TableToolbar />
          </>
        )}
        <Editable
          readOnly={readOnly}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={readOnly ? undefined : handleKeyDown}
          placeholder={placeholder}
          style={{ minHeight: className.includes('h-') ? undefined : minHeight }}
          className="flex-1 p-3 text-sm outline-none"
        />
      </div>
    </Slate>
  )
}