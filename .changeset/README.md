# Changesets

This repository releases itself with its own CLI. Run `bun run changeset` in a PR that changes
user-visible behavior, pick the bump, and describe the change. Merging the "Version Packages" PR
that `.github/workflows/release.yml` keeps open publishes the new version to npm.
