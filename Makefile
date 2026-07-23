# ── AgentGuard + project startup helpers ──────────────────────────────────────
# Usage:
#   make agentguard-start   Start AgentGuard proxy on :3939 (local Bun, bg)
#   make agentguard-stop    Kill the proxy
#   make agentguard-health  Check proxy health
#   make agentguard-register Register a new agent and print credentials
#   make dev                Start Next.js dev server (mock provider, no proxy)
#   make dev-real           Start both AgentGuard and Next.js (real AI)
# ──────────────────────────────────────────────────────────────────────────────

AGENTGUARD_DIR ?= ../agentguard
AGENTGUARD_URL ?= http://localhost:3939
AGENTGUARD_PID_FILE := .agentguard.pid

.PHONY: agentguard-start agentguard-stop agentguard-health agentguard-register dev dev-real

agentguard-start:
	@echo "→ Starting AgentGuard at $(AGENTGUARD_URL) …"
	@cd $(AGENTGUARD_DIR) && bun --hot index.ts & echo $$! > $(CURDIR)/$(AGENTGUARD_PID_FILE)
	@sleep 2
	@$(MAKE) agentguard-health

agentguard-stop:
	@if [ -f $(AGENTGUARD_PID_FILE) ]; then \
		kill $$(cat $(AGENTGUARD_PID_FILE)) 2>/dev/null || true; \
		rm -f $(AGENTGUARD_PID_FILE); \
		echo "→ AgentGuard stopped."; \
	else \
		echo "→ No PID file found — AgentGuard may not be running."; \
	fi

agentguard-health:
	@curl -sf $(AGENTGUARD_URL)/health && echo "✓ AgentGuard is healthy" || echo "✗ AgentGuard not responding"

agentguard-register:
	@echo "→ Registering agent with AgentGuard …"
	@curl -s -X POST $(AGENTGUARD_URL)/api/activate \
		-H "Content-Type: application/json" \
		-d '{"provider":"anthropic","api_key":"$(ANTHROPIC_API_KEY)","monthly_budget_usd":50,"alert_email":"$(ALERT_EMAIL)"}' \
		| bun -e "const d=await Bun.stdin.text();const j=JSON.parse(d);console.log('agent_id='+j.agent_id+'\nproxy_key='+j.proxy_key)"

dev:
	bun run next dev

dev-real: agentguard-start
	NEXT_PUBLIC_USE_REAL_AI=true bun run next dev
