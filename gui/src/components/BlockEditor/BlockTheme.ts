import * as Blockly from "blockly/core";

const parseColor = (color: string): string => {
  if (!color || color.startsWith("oklch")) return "";
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return color;
  try {
    ctx.fillStyle = color;
    return ctx.fillStyle;
  } catch {
    return "";
  }
};

const getColor = (color: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(color).trim();
  return parseColor(value);
};

const createCustomTheme = () => {
  return Blockly.Theme.defineTheme("customTheme", {
    base: Blockly.Themes.Classic,
    categoryStyles: {
      robot_category: {
        colour: getColor("--color-turquoise-700"),
      },
      list_category: {
        colour: "#4a148c",
      },
      logic_category: {
        colour: getColor("--color-turquoise-600"),
      },
      loop_category: {
        colour: getColor("--color-sunglow-400"),
      },
      text_category: {
        colour: "#FE9B13",
      },
      math_category: {
        colour: getColor("--color-tomato-600"),
      },
      variable_category: {
        colour: getColor("--color-purple-600") || "#A55EEA",
      },
      procedure_category: {
        colour: getColor("--color-purple-600") || "#A55EEA",
      },
      ai_category: {
        colour: "#006045",
      }
    },
    blockStyles: {
      list_blocks: {
        colourPrimary: "#4a148c",
        colourSecondary: "#AD7BE9",
        colourTertiary: "#CDB6E9",
      },
      logic_blocks: {
        colourPrimary: getColor("--color-turquoise-600"),
        colourSecondary: "#fff",
        colourTertiary: getColor("--color-turquoise-700"),
      },
      loop_blocks: {
        colourPrimary: getColor("--color-sunglow-500"),
        colourSecondary: "#ff0000",
        colourTertiary: getColor("--color-sunglow-600"),
      },
      text_blocks: {
        colourPrimary: "#FE9B13",
        colourSecondary: "#ff0000",
        colourTertiary: "#C5EAFF",
      },
      math_blocks: {
        colourPrimary: getColor("--color-tomato-600"),
        colourSecondary: getColor("--color-tomato-400"),
        colourTertiary: getColor("--color-tomato-700"),
      },
      variable_blocks: {
        colourPrimary: getColor("--color-purple-600") || "#A55EEA",
        colourSecondary: getColor("--color-purple-400") || "#BF8CFF",
        colourTertiary: getColor("--color-purple-700") || "#8B3FD9",
      },
      procedure_blocks: {
        colourPrimary: getColor("--color-purple-600") || "#A55EEA",
        colourSecondary: getColor("--color-purple-400") || "#BF8CFF",
        colourTertiary: getColor("--color-purple-700") || "#8B3FD9",
      },
    },
    componentStyles: {
      workspaceBackgroundColour: getColor("--color-white-smoke-300"),
      toolboxBackgroundColour: getColor("--color-sunglow-500"),
      toolboxForegroundColour: getColor("--color-sunglow-800"),
      flyoutBackgroundColour: getColor("--color-sunglow-50"),
      flyoutForegroundColour: "#ccc",
      flyoutOpacity: 1,
      scrollbarColour: "#C1C1C1",
      insertionMarkerColour: "#fff",
      insertionMarkerOpacity: 0.3,
      scrollbarOpacity: 0.4,
      cursorColour: "#d0d0d0",
    },
    name: "mrl"
  });
};

let customTheme: Blockly.Theme | null = null;

const getCustomTheme = () => {
  if (!customTheme) {
    customTheme = createCustomTheme();
  }
  return customTheme;
};

export default getCustomTheme;