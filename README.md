# specguard

A language-agnostic framework for ensuring software behavior expectations are deterministically mapped to tests and validated by reviewer agents.

## The Problem

As autonomous agents become more prevalent in software development, codeowners face several challenges:

- How do we ensure agents write tests that map to our expectations?
- How can we blend specifications and tests together?
- How do we add context to behavior expectations?
- How do we verify the testing is appropriate to the change?

**specguard** provides a framework to solve these issues.

## How It Works

### 1. Define Expectations in Markdown

Create markdown files in `specguard` folders throughout your repository following this template:

```markdown
# Feature Name

Feature description

## Expectation Name

Expectation description

levels: unit, integration, e2e

\`\`\`specguard
First step
Second step
Third step
\`\`\`
```

The `levels` field defines which test levels this expectation applies to (comma-separated). You can use standard levels like `unit`, `integration`, `e2e`, or define your own.

### 2. Deterministic File Mapping

specguard mirrors the directory structure from the `specguard` folder to test files in the parent directory.

**Example 1:** `parent/specguard/feature1.md`
- `level: unit` → `parent/unit/feature1.md`
- `level: integration` → `parent/integration/feature1.md`

**Example 2:** `parent/specguard/capabilities/feature2.md`
- `level: unit` → `parent/unit/capabilities/feature2.md`
- `level: e2e` → `parent/e2e/capabilities/feature2.md`

### 3. Mark Steps in Your Tests

Use inline step markers in your test files. Inspired by Playwright's `step()` API, but implemented as comments for universal language support:

**TypeScript (Vitest):**
```typescript
test("my capability", async () => {
  // step("First step")
  const client = createClient();
  
  // step("Second step")
  await client.connect();
});
```

**Python (pytest):**
```python
def test_my_capability():
    # step("First step")
    client = create_client()
    
    # step("Second step")
    client.connect()
```

### 4. Verify with Shell Scripts

specguard uses `src/stepguard.sh` to verify that steps defined in specguard files are present in the corresponding test files. This script runs regular expressions to match step markers deterministically.

Being a shell script makes specguard:
- **Language-agnostic** - Works with any programming language
- **Simple** - No complex runtime dependencies
- **CI-friendly** - Easy to integrate into continuous integration pipelines

## Why Not BDD?

BDD frameworks like Cucumber follow similar ideas but face challenges:

- **Syntax complexity** - Lost in a labyrinth of syntax trying to enforce links between feature files and step definitions
- **Generic vs. Specific tension** - Gherkin syntax is pushed between high-level definitions and specific placeholders that obfuscate prose
- **Framework lock-in** - BDD tooling is opinionated and doesn't work with your existing codebase

With specguard, you can add step markers to existing tests and immediately gain specification tracking without restructuring your codebase.

## Relationship to Spec-Kit

Spec-kit is a framework for defining specification files. Its underlying principles align with specguard, and at its core, specguard works with any markdown file inside a `specguard` folder that defines a `specguard` codeblock and testing levels.

However, spec-kit doesn't address _how_ spec files map to test files—a crucial step for building trust in autonomous, unsupervised agents. specguard's deterministic mapping ensures your expectations are matched in tests (or alerts you when they're not).

## Beyond Step Verification

### Handling Skipped and Empty Tests

LLMs sometimes give up or cheat, especially when failing at tasks. specguard ensures the testing structure linked to your expectations exists.

But structure alone isn't enough. You also need to validate test _contents_:

- Your CI validates test _execution_
- specguard validates test _structure_
- **Agent reviewers** validate test _behavior_

### Agent-Powered Review

Use `src/review_specguard.sh` to invoke an agent reviewer that:

1. Reads the specguard file and its deterministically linked test file
2. Verifies the test code actually honors the step expectations
3. Provides feedback on whether behavior expectations are met

Since test files don't change constantly, you only need to run this review when test files are modified.

### Codeown Your Expectations

**Codeown your specguard folders!** This is your final layer of protection:

- LLMs can attempt to edit specguard files
- Codeowners must approve changes to expectations
- Agents might spot gaps or suggest new coverage
- You remain the gatekeeper of behavior expectations

This creates a collaborative workflow: agents can propose changes, but humans have the final say on what behavior matters.

## Getting Started

1. Create a `specguard` folder in your project
2. Write expectation files using the markdown template
3. Add step markers to your existing tests
4. Run `src/stepguard.sh` to verify step coverage
5. (Optional) Use `src/review_specguard.sh` for agent-powered review
6. Add your `specguard` folders to CODEOWNERS

## Philosophy

specguard embraces simplicity and determinism to solve a universal problem: documenting and enforcing software engineering expectations. The solution doesn't need to be complex—it needs to be reliable, language-agnostic, and easy to run in CI.

By creating deterministic links between expectations and tests, specguard builds the foundation for trustworthy autonomous development.