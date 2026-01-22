# specguard

> Language-agnostic framework for deterministically mapping behavior expectations to tests

A language-agnostic framework for ensuring software behavior expectations are deterministically mapped to tests and validated by reviewer agents.

**Built with TypeScript and Bun for maximum performance and type safety.**

## The Problem

As autonomous agents become more prevalent in software development, codeowners face several challenges:

- How do we ensure agents write tests that map to our expectations?
- How can we blend specifications and tests together?
- How do we add context to behavior expectations?
- How do we verify the testing is appropriate to the change?

**specguard** provides a framework to solve these issues.

## Installation

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0

### Quick Install (from releases)

Download the latest pre-built binary from GitHub releases:

```bash
# Download latest release (coming soon)
curl -fsSL https://github.com/dipasqualew/specguard/releases/latest/download/specguard -o specguard
chmod +x specguard
mv specguard ~/.local/bin/  # or /usr/local/bin
```

### Install from Source

1. Clone the repository:

   ```bash
   git clone https://github.com/dipasqualew/specguard.git
   cd specguard
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Build the executable:

   ```bash
   bun run build
   ```

4. Install globally:

   ```bash
   cp dist/specguard ~/.local/bin/  # or /usr/local/bin
   ```

### Development

Run directly without building:

```bash
bun run dev [options] [directory]
```

### Verify Installation

```bash
specguard --help
```

### Uninstall

```bash
# If installed to ~/.local/bin
rm ~/.local/bin/specguard

# If installed to /usr/local/bin
sudo rm /usr/local/bin/specguard
```

## Quick Example

```bash
# Create a spec
mkdir -p myapp/specguard
cat > myapp/specguard/auth.md << 'EOF'
# Authentication

## Login

levels: unit

\`\`\`specguard
Validate credentials
Create session
Return token
\`\`\`
EOF

# Create a test
mkdir -p myapp/unit
cat > myapp/unit/auth.test.js << 'EOF'
test("login", () => {
  // step("Validate credentials")
  const valid = validate(user, pass);

  // step("Create session")
  const session = createSession(user);

  // step("Return token")
  return session.token;
});
EOF

# Verify
specguard myapp
# ✓ myapp/unit/auth.test.js
# Summary: 1 passed, 0 failed
```

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

### 4. Verify with TypeScript

specguard is built with TypeScript and Bun to verify that steps defined in specguard files are present in the corresponding test files. The CLI uses regular expressions to match step markers deterministically.

Being built with Bun and TypeScript makes specguard:

- **Language-agnostic** - Works with any programming language through comment-based step markers
- **Fast** - Bun's performance ensures rapid verification even in large codebases
- **Type-safe** - TypeScript provides robust error handling and maintainability
- **CI-friendly** - Compiles to a standalone executable for easy CI/CD integration

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

1. **Install specguard** (see Installation section above)

2. **Create a `specguard` folder** in your project

   ```bash
   mkdir -p myproject/specguard
   ```

3. **Write expectation files** using the markdown template

   ```bash
   cat > myproject/specguard/authentication.md << 'EOF'
   # Authentication

   ## User Login

   levels: unit

   \`\`\`specguard
   Validate credentials
   Create session
   Return auth token
   \`\`\`
   EOF
   ```

4. **Add step markers** to your existing tests

   ```javascript
   test("user login", () => {
     // step("Validate credentials")
     const valid = validateCredentials(user, pass);

     // step("Create session")
     const session = createSession(user);

     // step("Return auth token")
     return session.token;
   });
   ```

5. **Run specguard** to verify step coverage

   ```bash
   specguard myproject
   ```

6. **Add to CI/CD**

   ```yaml
   # .github/workflows/test.yml
   - name: Verify specifications
     run: specguard .
   ```

7. **(Optional)** Use `src/review_specguard.sh` for agent-powered review

8. **Add specguard folders to CODEOWNERS**

   ```
   # CODEOWNERS
   **/specguard/ @your-team
   ```

## Usage

### Basic Usage

```bash
# Verify specs in current directory
specguard

# Verify specs in specific directory
specguard path/to/project

# Show detailed step-by-step output
specguard --verbose path/to/project
```

### Command Line Options

```
Usage: specguard [OPTIONS] [DIRECTORY]

Options:
  -v, --verbose                    Show detailed step-by-step output
  --specguard-folder-name NAME     Use NAME instead of 'specguard' as folder name
  -h, --help                       Show help message

Arguments:
  DIRECTORY                        Directory to search (default: current directory)
```

### Examples

**Verbose output for debugging:**

```bash
specguard --verbose .
```

**Custom spec folder name:**

```bash
specguard --specguard-folder-name requirements .
```

**CI/CD Integration:**

```bash
# Exit with code 1 if any specs fail
specguard . || exit 1
```

## Philosophy

specguard embraces simplicity and determinism to solve a universal problem: documenting and enforcing software engineering expectations. The solution doesn't need to be complex—it needs to be reliable, language-agnostic, and easy to run in CI.

By creating deterministic links between expectations and tests, specguard builds the foundation for trustworthy autonomous development.

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/dipasqualew/specguard.git
cd specguard

# Install dependencies
bun install
```

### Commands

```bash
# Run in development mode
bun run dev [options] [directory]

# Build standalone executable
bun run build

# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run E2E tests only
bun run test:e2e

# Run tests with coverage
bun run test:coverage
```

### Project Structure

```
specguard/
├── src/
│   ├── index.ts        # Main CLI entry point
│   ├── specguard.ts    # Core verification logic
│   ├── output.ts       # CLI output formatting
│   ├── utils.ts        # Utility functions
│   ├── types.ts        # TypeScript type definitions
│   └── install.ts      # Installation script
├── tests/
│   ├── e2e/            # End-to-end tests
│   └── fixtures/       # Test fixtures
├── scripts/
│   └── build.ts        # Build script
└── dist/               # Built executables
```

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass (`bun run test`)
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
