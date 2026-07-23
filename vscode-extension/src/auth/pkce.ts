import * as crypto from "crypto";

export interface PKCEPair {
  verifier: string;
  challenge: string;
}

/** Generate a PKCE code_verifier + SHA-256 code_challenge pair. */
export function generatePKCE(): PKCEPair {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

/** Generate a cryptographically random state token for CSRF protection. */
export function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}
