/**
 * What a config reader actually needs from the environment: string lookups that
 * may be missing. Narrower than `NodeJS.ProcessEnv`, which Next.js augments with
 * a required `NODE_ENV` — a requirement no config reader here cares about, and
 * one that forces every caller (tests included) to supply a value it never reads.
 *
 * `process.env` is assignable to this, so production call sites are unchanged.
 */
export type EnvSource = Readonly<Record<string, string | undefined>>;
