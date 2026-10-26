# Development and Git workflow

## Ownership of work

This new repository is the project boundary. Keep all Chorusborn source, owned assets, reproducible configuration, and documentation here. Keep dependency installs and local runtime data out of Git. Do not copy another project's implementation or secrets into it.

## Commit discipline

The owner has explicitly requested a committed record of everything we do.

1. Inspect `git status --short` before work; preserve unrelated changes.
2. Implement one coherent increment with its relevant documentation.
3. Run checks appropriate to the change. A documentation edit needs link/contract review; engine changes need deterministic simulation checks.
4. Review `git diff --check`, the diff, and staged filenames for mistakes and secrets.
5. Stage explicit intended files and commit. Examples: `docs: define replay evidence contract`, `feat(sim): add deterministic capture resolution`, `fix(twitch): deduplicate retried teaching commands`.
6. Confirm the commit and `git status --short`; record material verification in the build log.

Never include credentials merely to make a commit complete. Keep placeholder configuration in examples and actual credentials in ignored local files or deployment secrets. Never claim a failing check passed. If implementation is unfinished, record the remaining work honestly; do not present it as release-ready.

## Documentation and implementation

Specifications describe the intended product, not proof that it exists. Update acceptance statuses only when evidence exists. Record changed decisions in `docs/decisions.md` and completed milestones in `docs/build-log.md`. Keep public-facing copy in planned tense until verified.

At the application scaffold, add actual setup commands, lockfile, supported runtime versions, a local fixture mode, and CI. Do not add placeholder scripts that report success without doing work.

## Branches, publishing, and licensing

`main` is the initial local branch. Use focused feature branches when useful; changes must still be committed. Creating a GitHub remote, pushing, provisioning billable services, publishing recordings, or submitting the entry are separate actions from local version control. The initial repository contains no license grant. Confirm a license decision before public release and maintain third-party notices for all shipped dependencies and assets.
