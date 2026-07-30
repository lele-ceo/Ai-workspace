/// <reference types="bun-types" />
// Makes `bun:test` and the rest of the Bun runtime API visible to `tsc`.
// Added as a reference rather than `compilerOptions.types` so the automatic
// inclusion of @types/react, @types/node and friends is left untouched.
