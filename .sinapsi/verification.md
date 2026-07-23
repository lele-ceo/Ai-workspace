# Verification checklist

No patch is complete until every box is ticked:

- [ ] builds / compiles
- [ ] lint & typecheck clean
- [ ] existing tests pass
- [ ] no obvious regressions
- [ ] architectural consistency & naming
- [ ] session.md + handoff.md updated

<!-- The concrete commands for this repo's stack are auto-filled below by `sinapsi init` (RFC 002 L5). -->

## Detected stack — run these before ticking the boxes
<!-- Auto-detected from the root manifests; edit if your scripts differ. -->

```sh
npm run build   # if defined
npm test
npm run lint    # if defined
```
