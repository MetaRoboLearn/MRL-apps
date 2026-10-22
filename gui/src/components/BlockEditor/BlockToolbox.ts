const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "AI",
      categorystyle: "ai_category",
      contents: [
        { kind: "block", type: "get_detected_objects" },
        { kind: "block", type: "get_detected_objects_conf" },
      ]
    },
    {
      kind: "category",
      name: "Robot",
      categorystyle: "robot_category",
      contents: [
        { kind: "block", type: "robot_start" },
        { kind: "block", type: "robot_stop" },
        { kind: "block", type: "robot_forward" },
        { kind: "block", type: "robot_backwards" },
        { kind: "block", type: "robot_turn_left" },
        { kind: "block", type: "robot_turn_right" },
        { kind: "block", type: "robot_sleep" },
        { kind: "block", type: "robot_display_char" },
        { kind: "block", type: "robot_display_clear" },
      ],
    },
    {
      kind: "category",
      name: "Logic",
      categorystyle: "logic_category",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
        { kind: "block", type: "logic_null" },
        { kind: "block", type: "logic_ternary" },
      ],
    },
    {
      kind: "category",
      name: "Loops",
      categorystyle: "loop_category",
      contents: [
        {
          kind: "block",
          type: "controls_repeat_ext",
          inputs: {
            TIMES: {
              shadow: {
                type: "math_number",
                fields: { NUM: 10 },
              },
            },
          },
        },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "controls_forEach" },
        { kind: "block", type: "controls_flow_statements" },
      ],
    },
    {
      kind: "category",
      name: "Math",
      categorystyle: "math_category",
      contents: [
        { kind: "block", type: "math_number", fields: { NUM: 123 } },
        {
          kind: "block",
          type: "math_arithmetic",
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 1 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          },
        },
        {
          kind: "block",
          type: "math_single",
          inputs: {
            NUM: { shadow: { type: "math_number", fields: { NUM: 9 } } },
          },
        },
        {
          kind: "block",
          type: "math_trig",
          inputs: {
            NUM: { shadow: { type: "math_number", fields: { NUM: 45 } } },
          },
        },
        { kind: "block", type: "math_constant" },
        {
          kind: "block",
          type: "math_number_property",
          inputs: {
            NUMBER_TO_CHECK: {
              shadow: { type: "math_number", fields: { NUM: 0 } },
            },
          },
        },
        {
          kind: "block",
          type: "math_round",
          fields: { OP: "ROUND" },
          inputs: {
            NUM: { shadow: { type: "math_number", fields: { NUM: 3.1 } } },
          },
        },
        { kind: "block", type: "math_on_list", fields: { OP: "SUM" } },
        {
          kind: "block",
          type: "math_modulo",
          inputs: {
            DIVIDEND: { shadow: { type: "math_number", fields: { NUM: 64 } } },
            DIVISOR: { shadow: { type: "math_number", fields: { NUM: 10 } } },
          },
        },
        {
          kind: "block",
          type: "math_random_int",
          inputs: {
            FROM: { shadow: { type: "math_number", fields: { NUM: 1 } } },
            TO: { shadow: { type: "math_number", fields: { NUM: 100 } } },
          },
        },
        { kind: "block", type: "math_random_float" },
        {
          kind: "block",
          type: "math_atan2",
          inputs: {
            X: { shadow: { type: "math_number", fields: { NUM: 1 } } },
            Y: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          },
        },
      ],
    },

    {
      kind: "category",
      name: "Text",
      categorystyle: "text_category",
      contents: [
        {
          kind: "block",
          type: "text",
          fields: { TEXT: "" },
        },
        {
          kind: "block",
          type: "text_join",
        },
        {
          kind: "block",
          type: "text_append",
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
                fields: { TEXT: "" },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_length",
          inputs: {
            VALUE: {
              shadow: {
                type: "text",
                fields: { TEXT: "abc" },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_isEmpty",
          inputs: {
            VALUE: {
              shadow: {
                type: "text",
                fields: { TEXT: "" },
              },
            },
          },
        },
        // {
        //   kind: "block",
        //   type: "text_indexOf",
        //   inputs: {
        //     VALUE: {
        //       shadow: {
        //         type: "text",
        //         fields: { TEXT: "Hello world" },
        //       },
        //     },
        //     FIND: {
        //       shadow: {
        //         type: "text",
        //         fields: { TEXT: "world" },
        //       },
        //     },
        //   },
        // },
        {
          kind: "block",
          type: "text_charAt",
          inputs: {
            VALUE: {
              shadow: {
                type: "text",
                fields: { TEXT: "abc" },
              },
            },
          },
        },
        // {
        //   kind: "block",
        //   type: "text_getSubstring",
        //   inputs: {
        //     STRING: {
        //       shadow: {
        //         type: "text",
        //         fields: { TEXT: "Hello world" },
        //       },
        //     },
        //   },
        // },
        {
          kind: "block",
          type: "text_changeCase",
          fields: { CASE: "UPPERCASE" },
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
                fields: { TEXT: "abc" },
              },
            },
          },
        },
        {
          kind: "block",
          type: "text_trim",
          fields: { MODE: "BOTH" },
          inputs: {
            TEXT: {
              shadow: {
                type: "text",
                fields: { TEXT: "   abc   " },
              },
            },
          },
        },
        // {
        //   kind: "block",
        //   type: "text_print",
        //   inputs: {
        //     TEXT: {
        //       shadow: {
        //         type: "text",
        //         fields: { TEXT: "Hello world" },
        //       },
        //     },
        //   },
        // },
        // {
        //   kind: "block",
        //   type: "text_prompt_ext",
        //   fields: { TYPE: "TEXT" },
        //   inputs: {
        //     TEXT: {
        //       shadow: {
        //         type: "text",
        //         fields: { TEXT: "Enter something:" },
        //       },
        //     },
        //   },
        // },
      ],
    },

    {
      kind: "category",
      name: "Lists",
      categorystyle: "list_category",
      contents: [
        { kind: "block", type: "lists_create_with" },
        { kind: "block", type: "lists_repeat" },
        { kind: "block", type: "lists_length" },
        { kind: "block", type: "lists_isEmpty" },
        { kind: "block", type: "lists_indexOf" },
        { kind: "block", type: "lists_getIndex" },
        { kind: "block", type: "lists_setIndex" },
        // { kind: "block", type: "lists_getSublist" },
        { kind: "block", type: "lists_sort" },
        { kind: "block", type: "lists_split" },
        { kind: "block", type: "lists_char" },
        { kind: "block", type: "lists_reverse" },
      ],
    },

    { kind: "sep" },
    {
      kind: "category",
      name: "Variables",
      categorystyle: "variable_category",
      custom: "VARIABLE",
    },
    {
      kind: "category",
      name: "Functions",
      categorystyle: "procedure_category",
      custom: "PROCEDURE",
    },
  ],
};

export default toolbox;
