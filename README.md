# dsh-wrong-question 0.4.1

A **standalone** wrong-question notebook for DeepSeek Harness.

The web client is emitted as a `window.__ModuleLoader__.load(...)` bundle, as required by Harness. A plain ESM `client.js` must not be published because it can interrupt registration of other client plugins loaded in the same response.

## Important

This plugin does **not** depend on `@lemoncat7/dsh-knowledge`.

It uses its own SQLite database and its own HTTP/Web UI. `dsh-knowledge` was only used as a reference for how a modern DSH plugin integrates with the Harness sidebar, main panel, and web server.

## UI

After installation, the plugin registers:

- left sidebar footer action: `错题库`
- a root `main` workspace on DSH 0.1.5+
- compatibility fallback to the older conversation slot
- dashboard with 30-day trends, distributions, activity and weekly report
- question list, full create/edit form and image attachment (PNG/JPEG/WebP/GIF, up to 5 MB)
- answer-hidden review workflow with Again / Hard / Good / Easy scheduling
- searchable question detail with original images, video and sandboxed HTML cards
- force-directed knowledge graph with weighted links and strongest-pair ranking

## Storage

`$DSH_HOME/wrong-question/wrong-questions.sqlite`, or `~/.dsh/wrong-question/wrong-questions.sqlite`.

## API

Same-origin routes under `/wrong-question-control/v1`.

## AI and image questions

No tutor agent is created here. Upload a question image in a Harness conversation and ask the Agent to analyze and save it. Harness Vision performs OCR/reasoning, then calls `add_question`. For an existing record it calls `analyze_question` with the record id and the structured result.

The workspace also accepts a local image attachment so the original question stays with the record. Existing local `image_path` records are served through a validated image endpoint. Generated image/video URLs and inline interactive HTML cards can be stored in the `artifacts` field. HTML runs in a sandboxed iframe without same-origin access.

## Agent tools

`add_question`, `analyze_question`, `get_question`, `update_question`, `delete_question`, `list_questions`, `search_questions`, `find_similar_questions`, `recall_wrong_questions`, `review_question`, `get_due_reviews`, `get_learning_dashboard`, and `get_knowledge_graph`.

`recall_wrong_questions` is described to the Agent as a pre-answer retrieval tool. Tool selection is still controlled by Harness, so deterministic retrieval for every user turn requires a Harness conversation pre-hook when that API becomes available.

Tool results are serialized to JSON text at the registration boundary. This matches the declared string output schema while preserving structured records for the Agent and avoids Harness lossless-JSON validation errors.

All records, attached images, analysis, review state, and review logs stay in the plugin's own SQLite database. Semantic embeddings remain an optional future retrieval backend; the current release uses SQLite FTS plus knowledge point, tag, and lexical similarity.
