# Analyzer, planner, and LLM contracts

This document describes the current `/server` runtime contract. The recommender
plan snapshots describe design intent; where that intent differs from the code,
the behavior below is authoritative.

## End-to-end flow

For Python submissions, analytics resolves the final submitted code and the
activity task's ordered programming-element configuration, then passes both to
the analyzer orchestrator. The orchestrator runs the complete analyzer and
projects its findings onto the configured elements. The feedback planner
selects evidence-backed sections, and the generator requests wording for those
sections from the configured provider. The server validates and assembles the
wording into a teacher-editable suggestion.

Blockly submissions skip code-element and coding-standard analysis. Analyzer
exceptions are logged by dataset creation and produce no task-analysis result.
The raw analyzer results and planner output are internal; the feedback API
returns only the assembled suggestion and fallback metadata.

## Analyzer contract

### Supported element IDs

Catalog IDs are canonical: an ID in the activity-task configuration must match
the analyzer's raw `code_elements[].type` exactly. The IDs are stored in a DB table `programming_element`. The current seeded catalog
contains:

| ID | Current detection meaning |
|---|---|
| `comment` | A source comment |
| `function_def` | A function definition |
| `loop` | A `for` or `while` loop |
| `branching` | An `if`, `elif`, or `else` branch |
| `variable_init` | A variable initialization |
| `variable_use` | A variable read or update |
| `list` | A list literal or list use |
| `tuple` | A tuple literal or tuple use |
| `builtin_call` | A configured platform built-in function call |
| `user_function_call` | A user-defined function call |
| `detect_object_call` | A call to `detect_object()` |
| `detect_object_conf_call` | A call to `detect_object_conf()` |

The last ID currently detects the function call itself. It does not establish
that the returned confidence value is used in a condition or compared with a
threshold. Stronger semantic
meaning behind detect_object_conf_call (which checks whether confidence was actually used somewhere) is not in the current contract.

### Internal raw analyzer result

The AST and regex analyzers return a raw object with:

```json
{
  "code_elements": [
    {
      "type": "loop",
      "line": "for item in items:",
      "lineno": 3,
      "end_lineno": 3,
      "col_offset": 0,
      "end_col_offset": 3
    }
  ],
  "stats": {
    "loop": true,
    "loop_count": 1
  }
}
```

`code_elements` are individual detections with source locations; `stats` has
aggregate booleans and counts. These raw values are consumed only by the
orchestrator and are not the task-analysis API shape.

The orchestrator tries AST parsing first. On a Python `SyntaxError`, it keeps
the parser error and runs the regex analyzer as an approximate fallback. An AST
parse failure has this raw shape before fallback:

```json
{
  "error": "parser error text",
  "syntax_error": {
    "message": "expected ':'",
    "lineno": 4,
    "end_lineno": 4,
    "col_offset": 9,
    "end_col_offset": 10,
    "source_line": "if ready"
  },
  "code_elements": [],
  "stats": {}
}
```

### Task-filtered analysis result

The orchestrator's result is shaped from the `raw` AST/REGEX results as follows. `description` and
`feedback_region_description` come from the selected catalog record;
`feedback_region_description` is used by the planner to describe a syntax-error
area without exposing parser details in generated wording.

```json
{
  "syntax_valid": true,
  "detection_method": "AST",
  "syntax_error": null,
  "expected_elements": [
    {
      "element_id": "loop",
      "name": "Petlja",
      "description": "Uporaba for ili while petlje.",
      "feedback_region_description": "dio koda koji ponavlja radnje",
      "position": 1,
      "weight": 1.0,
      "count": 1,
      "status": "detected",
      "evidence": [
        {
          "lineno": 3,
          "end_lineno": 3,
          "col_offset": 0,
          "end_col_offset": 3,
          "issues": []
        }
      ]
    }
  ],
  "weighted_completion": 1.0
}
```

Contract rules:

- `detection_method` is `AST` when parsing succeeds and `REGEX` when parsing
  fails and regex fallback is used. Consumers describe `REGEX` findings
  as approximate.
- `syntax_error` is `null` on successful parsing. On failure it contains the
  parser `message`, 1-based line range, 0-based column offsets, and source line.
- `expected_elements` contains only elements selected for this activity task,
  sorted by ascending `position`; the analyzer itself is not restricted to the
  selected set and always performs the "full" search.
- Each selected element has `element_id`, `name`, `description`,
  `feedback_region_description`, `position`, `weight`, `count`, `status`, and
  `evidence`. In evidence, line numbers are 1-based, offsets are 0-based, and
  unavailable coordinates are `null`.
- `count` equals the evidence-array length. No matching evidence means
  `status: "not_detected"`, `count: 0`, and `evidence: []`. Evidence without an
  attached issue means `status: "detected"`.
- The only current `detected_with_issue` case is a regex evidence range that
  overlaps the AST syntax-error line range. The evidence receives
  `issues: ["Pogreška sintakse: <parser message>"]`. Unmatched syntax errors
  remain only in the top-level `syntax_error`; unrelated findings are not
  marked as problematic. Evidence issues are simple display strings.
- A syntax error is still reported at the top level even if no configured
  evidence overlaps it. At most one overlapping evidence item per expected
  element is annotated for that syntax error.
- `weight` uses Rank Order Centroid from the configured order:
  `weight(i) = (1/n) * sum(1/j for j=i..n)`, where `i=1` is the highest
  priority. Weights and `weighted_completion` (which represents solution completeness from the perspective of used elements in code) are rounded to four decimal
  places. Only `detected` elements contribute their weight to `weighted_completion`; `not_detected` and
  `detected_with_issue` contribute zero. An empty configuration returns
  `expected_elements: []` and `weighted_completion: null`.

Teacher analytics retains the full task-analysis object, including positions,
weights, descriptions, and weighted completion. The reduced student-submission
projection retains syntax metadata and each configured element's ID, name,
count, status, and evidence, but omits position, weight, descriptions, and
`weighted_completion`.

## Feedback planner contract

`build_feedback_plan(task_analysis, code_standard_analysis=None)` is
deterministic. It does not generate wording and does not receive the submitted
code. It sorts expected elements by `position` and returns an internal plan.

For a non-empty task configuration, the plan has this shape:

```json
{
  "source": "task_analysis",
  "syntax_valid": true,
  "detection_method": "AST",
  "syntax_error": null,
  "praises": [
    {
      "kind": "element",
      "element_id": "loop",
      "name": "Petlja",
      "status": "detected",
      "position": 1,
      "description": "Uporaba for ili while petlje.",
      "evidence": []
    }
  ],
  "completion_statement": null,
  "main_recommendation": null,
  "additional_recommendation": null,
  "reflection_question": null
}
```

Planner items contain `kind`, `element_id`, `name`, `status`, `position`,
`description`, and `evidence`. They do not currently contain `weight` as weight was used for initial position sorting. A syntax-error recommendation has
`kind: "syntax_error"`, null element identity and position, empty evidence,
plus `syntax_error` and `syntax_region`.

Selection behavior:

1. A top-level syntax error becomes the main recommendation, ahead of
   element-level problems.
2. Otherwise, the first `not_detected` or `detected_with_issue` element by
   configured position is the main recommendation.
3. At most one further problem becomes the additional recommendation. The
   planner skips the main element and, when syntax is the main recommendation,
   skips an element carrying that same syntax issue.
4. Up to two praises are selected from `detected` elements that have evidence,
   in configured `position` order.
5. If every expected element is detected, the plan includes the deterministic
   completion statement `Svi očekivani programski elementi pronađeni su u
   rješenju.` and leaves both element-recommendation fields null.
6. The reflection target is the main recommendation, or otherwise the
   highest-priority detected element. Its `reflection_goal` is
   `address_selected_issue` (if there is a `detected_with_issue` or `syntax_error`) or `refine_existing_code` (if there are no issues with code, meaning that all elements are detected), respectively. If there
   is no target, the reflection item is null.

When `expected_elements` is empty, the planner takes a separate compatibility
path: `source` is `coding_standard_compatibility`, the task-feedback fields are
empty/null, and `code_standard_analysis` is retained in the plan. The generator
then requests one `compatibility_comment`; it does not produce the normal task
recommendation/reflection sections for this case. Instead it writes a "generic" feedback noting how well the code was written (ex. variable naming used, in which section of the code were functions defined, how were imports handled)

When `expected_elements` is non-empty and every expected element has status
`not_detected`, the planner returns `source: "all_not_detected"` without a
reflection target. This path is selected solely from the element statuses and
applies regardless of the detection method. In `default` style, the generator skips all provider
and beautify calls and returns one hardcoded encouragement message containing a
generic question. This is an intentional response mode, not provider fallback.
Mixed statuses, including `detected_with_issue`, continue through the normal
recommendation flow.

The planner currently has no generic issue identity or severity threshold. It strictly uses `position` (defined by ROC weight) as importance.
Additional-problem distinctness is based on element identity and the linked
syntax issue.

## LLM generation and provider contract

The selected prompt mode builds one `GenerationRequest` per selected section.
Its `kind` is one of `praise`, `main_recommendation`,
`additional_recommendation`, `reflection_question`, `compatibility_comment`,
`introduction`, `beautify`, or `beautify_variant_2`; each request carries
structured context as well as a `system_prompt` and a serialized `user_prompt`.
Fallback generation reads the structured context directly. Requests for
sections that are not in the plan are not sent. This means that every selected
plan section is one model request. For reference, if the plan has `praises`,
`main_recommendation`, and `reflection_question`, the LLM receives 3 separate
requests for those sections.

The provider receives only those prompts through this provider-neutral
interface:

```python
generate_text(system_prompt: str, user_prompt: str) -> str
```

`prompts_orchestrator.py` resolves `FEEDBACK_GENERATOR_ANSWER_STYLE` once and
delegates to the default or shortened prompt strategy. Both strategies consume
the same mode-independent feedback plan and own their prompt wording,
deterministic fallbacks, mode-specific validation, and final answer structure.
Shared output safeguards reject empty responses, section responses over 600
characters, multiline section responses, and numeric-grade text for every
mode. The default final prose pass is also required to be one paragraph; the
shortened final pass may retain structured lines but must preserve the
assembled skeleton, headings, bullets, and final question.

Prompts require Croatian, one concise sentence, evidence-grounded wording, no
invented detections or priorities, and no numerical grade. Code excerpts are
passed as data and explicitly treated as untrusted content, not instructions.
Praises receive their selected item and source excerpts. Element
recommendations receive a guidance goal, topic, relevant source excerpts, and
optional task title/preview to make recommendations aligned with task context and task goal. A syntax recommendation receives a broad
`syntax_region` and an exact source line/range as a location cue. It must direct
the student to inspect that location without exposing the parser message, source
line, missing token, exact problem, or correction. Reflection requests receive
the selected reflection goal/topic and relevant evidence or syntax region and
location cue. The compatibility request receives coding-standard findings.

The prompt asks for text shorter than 400 characters. Reflection text must end
in `?`, and shortened introductions must end in `!`. Invalid or failed section
generation uses deterministic Croatian fallback text. Generated sections are
first assembled in this order: praises, completion
statement, main recommendation, additional recommendation, reflection question.
For normal task feedback with more than one section, the server then makes one
final `beautify` request containing only those validated section texts. The
beautifier may connect the wording into one flowing paragraph made of multiple
short sentences, but may not add facts or sections. Its output must contain no
line breaks, labels, or numeric grades and must leave the reflection question
last. A one-sentence result is invalid. If the request fails or is invalid, the
pre-beautify ordered assembly is returned. The completion statement
is server-controlled, not LLM-generated. Compatibility feedback is not sent
through the task-feedback beautifier.

When `FEEDBACK_GENERATOR_ANSWER_STYLE` is `shortened` and the plan is task feedback (`task_analysis` or `all_not_detected`), the generator adds one `introduction` request. Its category is based on `task_analysis.weighted_completion`, rounded to a whole percentage like the student task card: below 40% is `low_coverage`, 40-79% is `moderate_coverage`, and 80% or higher is `high_coverage`. If the planner confirms that every expected element was detected, the category is `all_detected`, regardless of recommendations for other issues. If coverage is unavailable, the category is `coverage_unavailable` and the introduction should remain neutral. The praise, recommendation, and reflection sentences reuse the same per-section requests as `default`. The server merges validated sentences into the introduction, an optional `Ovo si dobro napravio:` bullet list, an optional `Ovo bi mogao bolje provjeriti:` bullet list, and a final reflection question. A `beautify_variant_2` request may only add simple Croatian connecting words. The server rejects output that changes line count, headings, bullet markers, the introduction, or the reflection's final `?`, or that adds content words; it then returns the merged text and records a fallback. In shortened mode, all-`not_detected` plans get one guidance recommendation and reflection instead of the provider-free encouragement message. The compatibility path keeps its default behavior.

Provider selection is deployment-side only:

| Setting | Behavior |
|---|---|
| `LLM_FEEDBACK_PROVIDER` | `local` (default) or `remote` |
| `LLM_FEEDBACK_LOCAL_API_BASE` | LM Studio API base; defaults to `http://localhost:1234/v1` |
| `LLM_FEEDBACK_LOCAL_MODEL` | LM Studio model; defaults to `google/gemma-4-26b-a4b-qat` |
| `LLM_FEEDBACK_GEMINI_API_KEY` | Required for `remote`; keep as a protected deployment secret |
| `LLM_FEEDBACK_GEMINI_MODEL` | Required model ID for `remote` |
| `FEEDBACK_GENERATOR_ANSWER_STYLE` | `default` (default) or `shortened`; missing or invalid values use `default` |

The provider factory caches one provider per backend worker process. Both
adapters support up to four concurrent section requests. LM Studio retries a
timeout/connection failure once; the Gemini adapter waits a random 0.5-1 second
before each request to spread concurrent load, and retries transient 5xx
responses once. See [`.env.example`](../../containerisation/.env.example) for
configuration placeholders.

## Feedback HTTP API

`POST /api/analytics/llm_feedback` is restricted to authenticated teachers and
administrators. The request body contains only the selected submission ID:

```json
{ "user_started_task_id": 41 }
```

The body must be a JSON object and the ID must be a positive integer; the
backend excludes booleans even though Python treats them as integers. A
non-object body or missing/invalid ID returns HTTP 400. The server resolves the
student, code, task configuration, and analyses through the authorized
analytics dataset. The client must not send code, analysis, user IDs, provider
mode, or credentials as authoritative input.

Successful responses have HTTP 200:

```json
{
  "suggestion": "Lijepo si upotrijebio/la petlju.\n...",
  "used_fallback": false,
  "fallback_sections": [],
  "fallback_reasons": []
}
```

`fallback_sections` contains generation kinds that used fallback text;
`fallback_reasons` contains corresponding `{ "section", "reason" }` entries.
The server does not persist the draft; the teacher reviews and edits it before
assigning or updating a badge comment.

Errors use `{ "error": "...", "code": "..." }` where applicable:

| HTTP status | Case |
|---|---|
| 400 | Invalid/missing `user_started_task_id`, or submitted code unavailable |
| 404 | Submission not found or not available in the authorized dataset |
| 502 | Provider/configuration failure or unexpected generation failure |

The error code is one of `configuration`, `timeout`, `rate_limit`,
`authentication`, `invalid_response`, or `provider`. Section-level provider
errors and invalid generated text normally produce a 200 response with fallback
metadata instead of failing the entire request.


