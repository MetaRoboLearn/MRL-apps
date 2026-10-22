// robot blocks
const start = {
  type: "robot_start",
  message0: "start",
  args0: [],
  nextStatement: "robot",
  colour: "#5CB85C",
  tooltip: "",
  helpUrl: "",
};

const stop = {
  type: "robot_stop",
  message0: "stop",
  args0: [],
  previousStatement: "robot",
  colour: "#D9534F",
  tooltip: "",
  helpUrl: "",
};

const goForward = {
  type: "robot_forward",
  message0: "go forward, duration: %1, speed: %2",
  args0: [
    {
      type: "field_number",
      name: "DURATION",
      value: 1,
      min: 0.1,
    },
    {
      type: "field_number",
      name: "SPEED",
      value: 30,
      min: 1,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: "#008e91",
  tooltip: "",
  helpUrl: "",
};

const goBackwards = {
  type: "robot_backwards",
  message0: "go backwards, duration: %1, speed: %2",
  args0: [
    {
      type: "field_number",
      name: "DURATION",
      value: 1,
      min: 0.1,
    },
    {
      type: "field_number",
      name: "SPEED",
      value: 30,
      min: 1,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: "#008e91",
  tooltip: "",
  helpUrl: "",
};

const turnLeft = {
  type: "robot_turn_left",
  tooltip: "",
  helpUrl: "",
  message0: "turn left, duration: %1, speed %2",
  args0: [
    {
      type: "field_number",
      name: "DURATION",
      value: 1,
      min: 0.1,
    },
    {
      type: "field_number",
      name: "SPEED",
      value: 50,
      min: 1,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: "#008e91",
};

const turnRight = {
  type: "robot_turn_right",
  tooltip: "",
  helpUrl: "",
  message0: "turn right, duration: %1, speed %2",
  args0: [
    {
      type: "field_number",
      name: "DURATION",
      value: 1,
      min: 0.1,
    },
    {
      type: "field_number",
      name: "SPEED",
      value: 50,
      min: 1,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: "#008e91",
};

const sleep = {
  type: "robot_sleep",
  message0: "sleep for %1 seconds",
  args0: [
    {
      type: "field_number",
      name: "DURATION",
      value: 1,
      min: 0.1,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: "#008e91",
}

const displayChar = {
  type: "robot_display_char",
  message0: "display character %1",
  args0: [
    {
      type: "input_value",
      name: "TEXT",
      check: "String",
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: "#008e91",
}

const displayClear = {
  type: "robot_display_clear",
  message0: "clear display",
  previousStatement: null,
  nextStatement: null,
  colour: "#008e91",
}

//// list blocks
const listsChar = {
  type: "lists_char",
  message0: "make list of characters from %1",
  args0: [
    {
      type: "input_value",
      name: "TEXT",
      check: "String",
    },
  ],
  output: "Array",
  colour: "#4a148c",
  tooltip: "Creates a list containing each character of the given text.",
  helpUrl: "",
};

//// ai blocks

const getDetectedObjects = {
  type: "get_detected_objects",
  message0: "get detected objects",
  args0: [],
  output: "Array",
  colour: "#006045",
}

const getDetectedObjectsConf = {
  type: "get_detected_objects_conf",
  message0: "get detected objects with confidence %1",
  args0: [
    {
      type: "field_number",
      name: "CONFIDENCE",
      value: 0.3,
      max: 1,
      min: 0.05,
    },
  ],
  output: "Array",
  colour: "#006045",
}

export default [
  start,
  stop,
  goForward,
  goBackwards,
  turnLeft,
  turnRight,
  sleep,
  displayChar,
  displayClear,
  listsChar,
  getDetectedObjects,
  getDetectedObjectsConf
]