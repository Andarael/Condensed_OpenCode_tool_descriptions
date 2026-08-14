import { createHash } from "node:crypto"

const TARGET_VERSION = "1.18.16"

const audited = {
  apply_patch: {
    hash: "2e88f3a8fb30723c4fd6a084ef20716dec6b6ea66aa943dde675e81c5cb1cc4e",
    description: `Edit files with this patch format:

*** Begin Patch
[one or more file operations]
*** End Patch

Each operation starts with exactly one header:
- \`*** Add File: <path>\`: create a file; every content line must start with \`+\`.
- \`*** Delete File: <path>\`: delete a file; no content follows.
- \`*** Update File: <path>\`: patch a file; optionally follow with \`*** Move to: <new path>\`.

Example:
\`\`\`
*** Begin Patch
*** Add File: hello.txt
+Hello world
*** Update File: src/app.py
*** Move to: src/main.py
@@ def greet():
-print("Hi")
+print("Hello, world!")
*** Delete File: obsolete.txt
*** End Patch
\`\`\`

Always include the envelope and an operation header. Prefix every added line with \`+\`, including all lines of a new file.`,
  },
  glob: {
    hash: "50b2d2c41d4b8d0286ab4542c6ec882421ac4ae5c0567ad213c3668ed973ed9a",
    description: `Fast filename search over any codebase. Supports patterns such as \`**/*.js\` and \`src/**/*.ts\`; returns matching paths. Use for filename patterns. For open-ended searches needing repeated Glob/Grep rounds, use Task. Batch independent searches in parallel.`,
  },
  grep: {
    hash: "97fa2a9929353d20d3418041aae53ffea3aaf63e9a6e2fdc8cff6db61c3f4c5e",
    description: `Fast regex content search over any codebase. Supports full regex (for example \`log.*Error\` or \`function\\s+\\w+\`) and an \`include\` file glob such as \`*.js\` or \`*.{ts,tsx}\`. Returns paths, line numbers, and matching lines. Use Bash with \`rg\` (not grep) to count matches. For open-ended searches needing repeated Glob/Grep rounds, use Task.`,
  },
  read: {
    hash: "98ee843341c2dab2227add0019e48d4b2f0f00f9b042b853d1ee52bb34e6363d",
    description: `Read a local file or directory; missing paths error.

- \`filePath\` must be absolute. Use Glob if unsure of the path.
- Returns up to 2000 lines from the start by default. \`offset\` is 1-indexed; use it for later sections and \`limit\` to cap output.
- File lines are \`N: <content>\` (file \`foo\\n\` becomes \`1: foo\\n\`). Directories return one entry per line, with \`/\` after subdirectories.
- Lines over 2000 characters are truncated. Use Grep for large files or long lines.
- Read multiple known files in parallel; avoid repeated tiny 30-line slices and request a larger window.
- Reads images and PDFs and returns them as file attachments.`,
  },
  task: {
    hash: "220dcf4ad2582dbdaf2b0bbc8b7f5fa78172b1337539ac1c8912f45f2b9e5d46",
    alternateHashes: ["9e1ca56fd3a3c446d618181c3ef7c669db32cbf864614dae5add4899646d2045"],
    description: `Launch an agent for complex multistep work; always specify \`subagent_type\`.

Use for custom slash commands (pass the whole command as the prompt) and when an agent description says to use it proactively, such as a code reviewer after significant changes.

Do not use to read a known path (Read/Glob), find a specific definition (Grep), search 2-3 known files (Read), or for work unrelated to available agents.

- Launch independent agents concurrently in one message.
- Do not duplicate delegated work; continue with non-overlapping work or wait. Background completion is announced automatically.
- The agent returns one message that the user cannot see; summarize it to the user. Reuse its \`task_id\` to continue the same context.
- New calls start fresh unless resumed. Give a detailed autonomous task, exact expected return, whether to write or only research, and a verification command when possible.
- Generally trust agent output.`,
  },
  todowrite: {
    hash: "f214ea20cd870a9837cb30dd993aefbe5abe6d9e3319b47672c529961ba0c3ad",
    description: `Create and maintain the current session's structured task list.

Use proactively for 3+ distinct steps, non-trivial planning, multiple user tasks, an explicit todo request, or new instructions. Skip a single straightforward task, fewer than 3 trivial steps, and informational/conversational requests.

States: \`pending\`, \`in_progress\` (exactly one while work remains), \`completed\`, \`cancelled\`.

- Mark a task in progress before starting; update in real time and do not batch completions.
- Complete only after the work and required verification actually finish. If blocked/partial, keep it in progress and add a follow-up describing the blocker.
- Cancel irrelevant work. Keep items specific and actionable; split large work. Preserve user commands verbatim, including flags, arguments, and order.
- Add discovered follow-ups. For unknown scope (for example a repo-wide rename), discover scope first, then create the list.

Use for a multi-feature change plus tests/build; skip one comment edit. When in doubt, use it.`,
  },
}

const bashDescription = `Run terminal commands using the active OS and shell. Use the \`workdir\` parameter instead of changing directory inside the command. Use the existing approved temporary directory announced by OpenCode for temporary work outside the workspace.

Use Bash for terminal operations such as git, package managers, tests, builds, and Docker—not for file reading, writing, editing, searching, or listing when Read, Write, Edit, Grep, or Glob applies.

- Before creating files/directories, verify the intended parent exists. Quote paths containing spaces. Respect the active shell's syntax: Windows PowerShell 5.1 has no \`&&\`; PowerShell uses cmdlets/\`$env:NAME\`; cmd uses \`%NAME%\`; POSIX shells use their native syntax.
- \`command\` is required; optional timeout is milliseconds. Commands default to OpenCode's announced timeout. If output exceeds announced line/byte limits, OpenCode saves the full output: inspect it with Read offsets or Grep; do not truncate with head/tail, pagination, or shell equivalents.
- Run independent commands as parallel Bash calls in one message. Chain dependent commands with the active shell's success operator/conditional. Use the shell's simple sequential separator only when earlier failure does not matter. Do not separate commands with unquoted newlines.
- Never use interactive flags such as \`-i\`.

# Git and GitHub
- Commit, amend, push, or create a PR only when explicitly requested. If intent is unclear, ask first.
- Before committing inspect status, diff, and recent log; stage only intended files. Never commit secrets. Match repository commit style. Do not change git config, skip hooks, force-push, or create empty commits unless explicitly requested.
- Amend only when explicitly requested or when the immediately previous commit was created by you in this conversation, has not been pushed, and the user requested the amend-worthy change. If commit/hooks fail, fix and create a new commit rather than amending the failed attempt.
- Do not use Task or TodoWrite while performing the commit itself.
- Before a PR inspect status, diff, tracking branch, recent commits, and full base-branch diff. Review every included commit. Use \`gh\` for GitHub URLs/tasks (PRs, issues, checks, releases); return the PR URL. Pass multiline PR bodies using the active shell's safe file/string mechanism.`

const digest = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex")

export function createDefinitionHook(version, warn = console.warn, hash = digest) {
  const warned = new Set()
  return async ({ toolID }, output) => {
    if (version !== TARGET_VERSION) {
      if (!warned.has("version")) {
        warned.add("version")
        warn(`[condensed-tools] OpenCode ${version || "unknown"} is not audited (${TARGET_VERSION}); keeping vanilla descriptions.`)
      }
      return
    }

    if (toolID === "bash") {
      output.description = bashDescription
      return
    }

    const replacement = audited[toolID]
    if (!replacement) return
    const actual = hash(output.description)
    if (actual !== replacement.hash && !replacement.alternateHashes?.includes(actual)) {
      if (!warned.has(toolID)) {
        warned.add(toolID)
        warn(`[condensed-tools] ${toolID} description drifted (${actual}); keeping vanilla description.`)
      }
      return
    }
    output.description = replacement.description
  }
}

async function installedVersion($) {
  try {
    return (await $`opencode --version`.quiet().text()).trim()
  } catch {
    return ""
  }
}

export default async ({ $ }) => ({
  "tool.definition": createDefinitionHook(await installedVersion($)),
})

export const audit = () => ({ TARGET_VERSION, audited, bashDescription, digest })
