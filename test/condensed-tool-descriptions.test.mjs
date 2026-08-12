import assert from "node:assert/strict"
import * as plugin from "../.opencode/plugin/condensed-tool-descriptions.js"

assert.ok(Object.values(plugin).every((value) => typeof value === "function"), "every v1 plugin export must be a function")
const audit = plugin.audit()
const { createDefinitionHook } = plugin

for (const [toolID, replacement] of Object.entries(audit.audited)) {
  const parameters = { untouched: true }
  const output = { description: `vanilla ${toolID}`, parameters }
  await createDefinitionHook(audit.TARGET_VERSION, console.warn, () => replacement.hash)({ toolID }, output)
  assert.equal(output.description, replacement.description, `${toolID}: not replaced`)
  assert.equal(output.parameters, parameters, `${toolID}: parameters changed`)
}

const unknown = { description: "original", parameters: {} }
await createDefinitionHook(audit.TARGET_VERSION)({ toolID: "future_tool" }, unknown)
assert.equal(unknown.description, "original")

const warnings = []
const drifted = { description: "new capability", parameters: {} }
await createDefinitionHook(audit.TARGET_VERSION, (message) => warnings.push(message))({ toolID: "read" }, drifted)
assert.equal(drifted.description, "new capability")
assert.equal(warnings.length, 1)

const upgraded = { description: "new bash capability", parameters: {} }
await createDefinitionHook("1.18.17", (message) => warnings.push(message))({ toolID: "bash" }, upgraded)
assert.equal(upgraded.description, "new bash capability")
assert.match(audit.audited.read.description, /images and PDFs.*file attachments/)

console.log(`ok - ${Object.keys(audit.audited).length + 1} audited tools`)
