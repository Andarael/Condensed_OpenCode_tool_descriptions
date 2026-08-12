# Condensed OpenCode tool descriptions

Local OpenCode plugin derived from PR [#24202](https://github.com/anomalyco/opencode/pull/24202), audited against OpenCode **1.18.16**. It replaces only the descriptions of `bash`, `apply_patch`, `glob`, `grep`, `read`, `task`, and `todowrite`. It never changes tool schemas, execution, results, or conversation history.

The plugin is fail-closed:

- an OpenCode version other than 1.18.16 keeps every vanilla description;
- a changed static description keeps the vanilla text and emits a warning with its SHA-256;
- unknown and unaudited tools are untouched.

Project-local installation is already in `.opencode/plugin/`. To install globally, copy `condensed-tool-descriptions.js` to `~/.config/opencode/plugin/`.

## Validation

Run the deterministic audit:

```powershell
node --test test/condensed-tool-descriptions.test.mjs
```

Then compare two new OpenCode sessions using the same model and one short prompt. Temporarily rename the plugin file to end in `.disabled`, record initial input/context tokens, restore it, and repeat in another new session. Exercise `bash`, `read`, `apply_patch`, `task`, `todowrite`, `grep`, and `glob`; include a text file, image, and PDF for `read`.

Measured with two fresh `openai/gpt-5.6-luna` sessions and the same prompt:

- vanilla: 8,858 input tokens;
- this plugin: 7,220 input tokens;
- saved: 1,638 input tokens (18.5%).
