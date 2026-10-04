import type { Migration } from './index';

// Additive (CLAUDE.md rule 9): optional tutorial link per exercise (ED-7, PD-18).
export const m0003: Migration = {
  version: 3,
  up: [`ALTER TABLE exercise ADD COLUMN tutorial_url TEXT NOT NULL DEFAULT ''`],
};
