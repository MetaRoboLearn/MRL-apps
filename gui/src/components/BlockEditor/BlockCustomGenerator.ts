import {pythonGenerator} from "blockly/python";
import * as Blockly from "blockly";

//// robot blocks
// start
pythonGenerator.forBlock["robot_start"] = function (): string {
  return ``;
};

// stop
pythonGenerator.forBlock["robot_stop"] = function (): string {
  return ``;
};

// turn left
pythonGenerator.forBlock["robot_turn_left"] = function (block: Blockly.Block): string {
  const number_speed: string = block.getFieldValue("SPEED");
  const number_duration: string = block.getFieldValue("DURATION");

  return `turn_left(${number_duration}, ${number_speed})\n`;
};

// turn right
pythonGenerator.forBlock["robot_turn_right"] = function (block: Blockly.Block): string {
  const number_speed: string = block.getFieldValue("SPEED");
  const number_duration: string = block.getFieldValue("DURATION");

  return `turn_right(${number_duration}, ${number_speed})\n`;
};

// go forward
pythonGenerator.forBlock["robot_forward"] = function (block: Blockly.Block): string {
  const number_speed: string = block.getFieldValue("SPEED");
  const number_duration: string = block.getFieldValue("DURATION");

  return `forward(${number_duration}, ${number_speed})\n`;
};

// go backwards
pythonGenerator.forBlock["robot_backwards"] = function (block: Blockly.Block): string {
  const number_speed: string = block.getFieldValue("SPEED");
  const number_duration: string = block.getFieldValue("DURATION");

  return `back(${number_duration}, ${number_speed})\n`;
};

pythonGenerator.forBlock["robot_sleep"] = function (block: Blockly.Block): string {
  const number_duration: string = block.getFieldValue("DURATION");
  return `sleep(${number_duration})\n`;
}

pythonGenerator.forBlock["robot_display_char"] = function (block: Blockly.Block): string {
  const text = pythonGenerator.valueToCode(block, "TEXT", 0) || "''";
  return `display_char(${text}[0])\n`;
};

pythonGenerator.forBlock["robot_display_clear"] = function (): string {
  return `display_clear()\n`;
}

//// list blocks
pythonGenerator.forBlock["lists_char"] = function (block: Blockly.Block) {
  const text = pythonGenerator.valueToCode(block, "TEXT", 0) || "''";
  const code = `list(${text})`;
  return [code, 0];
};

//// ai blocks
pythonGenerator.forBlock["get_detected_objects"] = function () {
  const code = `get_detected_objects()`;
  return [code, 0];
};

pythonGenerator.forBlock["get_detected_objects_conf"] = function (block: Blockly.Block) {
  const code = `get_detected_objects_conf(${block.getFieldValue("CONFIDENCE")})`;
  return [code, 0];
};