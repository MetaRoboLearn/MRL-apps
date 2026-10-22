import * as monaco from "monaco-editor";

const colours = {
  'background': '#fffbde',
  'foreground': '#676767',  // --color-white-smoke-900
  'lineHighlightBackground': '#ffeb9e', // --color-sunglow-200
  'lineNumber.foreground': '#454949', // --color-dark-neutrals-400
  'lineNumber.activeForeground': '#101414', // --color-dark-neutrals-700

  'keyword': '#b43a30', // --color-tomato-700
  'comment': '#b49220', // --color-sunglow-700
  'string': '#008e91', // --color-turquoise-700
}

export const codeTheme: monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "keyword", foreground: colours['keyword']},
    { token: "identifier", foreground: colours['foreground'] },
    { token: "number", foreground: colours['string'] },
    { token: "string", foreground: colours['string'] },
    { token: "comment", foreground: colours['comment']},
  ],
  colors: {
    "editor.background": colours['background'],
    "editor.foreground": colours['foreground'],
    "editorLineNumber.foreground": colours['lineNumber.foreground'],
    "editorLineNumber.activeForeground": colours['lineNumber.activeForeground'],
    "editorCursor.foreground": colours['foreground'],
    "editor.lineHighlightBackground": colours['lineHighlightBackground'],
  },
}