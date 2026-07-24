# Contributing to AetherCEP

Thanks for helping improve AetherCEP. Small, focused pull requests are easiest to review.

## Before you start

- Search open issues and pull requests for related work.
- Open a feature request before investing in a large UI, workflow, or architecture change.
- Never add downloaded media, cookies, credentials, release archives, or third-party executables to a pull request.
- Keep panel JavaScript compatible with the older Chromium/Node runtime shipped by supported Premiere versions. Avoid modern syntax unless compatibility has been verified in CEP.

## Set up a development copy

1. Fork and clone the repository.
2. Install Node.js 18 or newer.
3. Run `npm test`.
4. Follow [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) to install the extension and runtime tools.

## Making changes

- Put browser/panel behavior in `js/`, host API calls in `jsx/main.jsx`, and styling in `css/app.css`.
- Keep shell arguments as arrays passed to `spawn`/`execFile`; do not concatenate untrusted URLs or paths into a shell command.
- Add or update tests for pure logic.
- Test in the oldest Premiere version affected when possible.
- Update user-facing documentation when behavior, setup, or requirements change.

## Commit and pull request checklist

- [ ] `npm test` passes.
- [ ] The extension opens without console or ExtendScript errors.
- [ ] User input, file paths, and errors are handled safely.
- [ ] Logs and screenshots contain no credentials or private data.
- [ ] Documentation and version metadata are updated where needed.
- [ ] The pull request explains the problem, solution, and manual verification.

By contributing, you confirm that you have the right to submit the work. A project license has not yet been declared; discuss licensing with the maintainer before substantial contributions.
