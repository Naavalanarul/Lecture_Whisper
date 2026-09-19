# Style Rules — Lecture Whisper

## Python
- Formatter/linter: `ruff` (format + check)
- Type checker: `mypy` (strict mode)
- Python version: 3.12
- Line length: 99
- Imports: sorted by `ruff` (isort-compatible)
- Docstrings: Google style, required for public APIs
- Naming: snake_case for functions/variables, PascalCase for classes

## TypeScript
- Strict mode enabled
- No `any` types except in generated code
- Use `interface` over `type` for object shapes

## Commits
- Conventional commits: `type(scope): description`
- Types: feat, fix, refactor, test, docs, chore, ci
- Scopes: server, ui, mobile, pipeline, llm, store, cli, eval, train
- One logical change per commit
- Never commit audio files, tokens, or .env files

## Code Review Checklist
- [ ] All changed code has tests
- [ ] No hardcoded secrets or paths
- [ ] Types are explicit (no implicit Any)
- [ ] Error messages are actionable
