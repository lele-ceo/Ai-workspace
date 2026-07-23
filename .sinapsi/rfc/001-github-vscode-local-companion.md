# RFC 001 — GitHub and VS Code local companion integration

## Context

The product should become an open-source AI developer workspace that users can
connect to GitHub and operate from inside VS Code, including proposed terminal
commands. The current project is a single Next.js application with a Claude /
AgentGuard chat route; it has no authentication, user database, GitHub OAuth,
extension runtime or local command bridge.

A browser cannot safely or generally control a user’s local VS Code process or
terminal. A direct web-to-shell API would be a remote-code-execution backdoor.
The integration must keep user API keys out of the browser and preserve the
existing AgentGuard enforcement path for hosted live AI.

## Proposal

Build the feature as three explicit components:

1. **Web workspace** — current Next.js app gains sign-in, repository context,
   connection status, command proposals and execution history. It never obtains
   unrestricted shell access.
2. **GitHub App** — use a GitHub App, not a broad personal access token. Users
   install it only on selected repositories. Start read-only; request write
   permissions only when the user deliberately enables branch/PR creation.
3. **VS Code local companion extension** — installed by the user from the VS
   Code Marketplace or `.vsix`. It establishes an outbound authenticated
   session to the service, reads only the user-selected trusted workspace, and
   exposes reviewed actions: inspect files, create a patch, run an allowlisted
   command, and open a diff. It must use VS Code Workspace Trust.

### Permission model

| Capability | Initial permission | Consent rule |
| --- | --- | --- |
| Sign in | GitHub App user authorization | Identity only; no repository installation required. |
| Read repository metadata/code | GitHub App Contents: read, Metadata: read | User selects repositories during installation. |
| Create branch, commit or pull request | Contents: write, Pull requests: write | Disabled by default; per-action confirmation with diff. |
| Read local workspace | VS Code extension + Workspace Trust | User chooses the workspace; no background scanning. |
| Run terminal command | VS Code extension | Display exact command, working directory and risk; require approval for every command initially. |
| Store user model keys | VS Code SecretStorage or encrypted server vault | Never `localStorage`, never `NEXT_PUBLIC_*`, never logs. |

### Terminal execution policy

- Default mode is **propose-only**: the model returns a command and rationale.
- The user approves each exact command in VS Code. No `shell: true` gateway
  exposed from the web application.
- Commands run only in the trusted, selected workspace. No arbitrary working
  directory, no elevated privileges, no background daemon.
- Block destructive or credential-exfiltration patterns by default and require
  an explicit second confirmation for a small reviewable exception list.
- Save an immutable local execution record: timestamp, command, directory,
  user decision, exit code and redacted output.
- Model API calls from the hosted web app continue through AgentGuard; locally
  supplied keys must be held by the extension’s secret store and are never sent
  back to the web UI.

### Delivery phases

1. Publish the repository with governance: LICENSE, CONTRIBUTING, SECURITY,
   Code of Conduct, issue/PR templates, demo, screenshots and transparent
   roadmap.
2. Add GitHub App OAuth sign-in and an encrypted server-side connection store.
3. Ship the VS Code extension in read-only/propose-only mode with Workspace
   Trust gating and a visible connected-workspace indicator.
4. Add diff application and terminal command approval/execution with audit
   history.
5. Add optional GitHub write actions (branch/commit/PR) behind explicit scopes
   and confirmation.

## Alternatives

- **Browser controls local terminal directly:** rejected; browsers do not have
  this authority and workarounds create an unacceptable remote execution path.
- **Ask users for personal access tokens:** rejected as the primary path;
  token scope and revocation are harder for an open-source product to explain
  safely than a repository-selected GitHub App installation.
- **Cloud-only coding sandbox:** deferred; it changes the product into a
  hosted development environment and introduces compute, isolation and billing
  requirements unrelated to the user’s existing VS Code workspace.

## Decision

Adopt a GitHub App plus VS Code local companion architecture. Build it
incrementally with read-only access and per-command approval first; no
unattended terminal execution or broad repository write scope.

## Consequences

- Requires a new authenticated backend, encrypted persistence, a GitHub App
  registration, a public privacy policy and security disclosure process.
- Requires the project owner to provide the GitHub App client ID, private key,
  webhook secret, permitted callback URLs and deployment domain.
- Requires an extension repository/package, signing/publishing identity and
  Marketplace publishing decision.
- The existing prototype can remain usable during the migration, but a public
  beta must not claim GitHub or terminal control until these components are
  implemented and security-reviewed.
