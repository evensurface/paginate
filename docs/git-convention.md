# Git Convention

Use only for commits, commit-message suggestions, commit readiness, or PR notes.

## Commit Format

`<type>(<scope>): <summary>`

Scope is required.

Examples:

```txt
feat(sdk): add client factory
fix(auth): handle expired sessions
docs(repo): document git convention
```

### Types

- `feat` — new feature/API
- `fix` — bug fix
- `docs` — documentation only
- `test` — tests only
- `refactor` — no behavior change
- `chore` — maintenance/config/tooling
- `build` — build/bundling
- `ci` — CI/CD

Use the smallest accurate type.

### Scope

Use the smallest clear package, app, feature, or area affected.

For repo-wide changes, use a clear broad scope such as `repo` or `config`.

### Summary

- imperative, present tense
- concise and specific
- no trailing period
- describe one logical change

Avoid vague messages such as `update stuff`, `fix bug`, `changes`, or `final`.

## Commit Rules

- One logical change per commit.
- Multiple files are fine when part of the same change.
- Inspect the diff before choosing the message.
- Do not include unrelated changes.
- Do not commit generated files unless explicitly requested.
- Never claim a commit was created unless the git command actually ran.

## Breaking Changes

Add `!` after the scope:

```txt
feat(sdk)!: rename client factory
```

Use a commit body when migration impact or important context is not obvious:

```txt
BREAKING CHANGE: `createClient` was renamed to `createBelaClient`.
```

## PR Notes

```md
## Summary

- What changed
- Why it changed

## Verification

- Commands run

## Notes

- API changes, risks, or follow-ups
```
