import { createRepo, SCENARIOS } from './state.js';
import { runCommand } from './commands.js';
import { graphLayout } from './graph.js';
import { validatePractice } from './validate.js';

export {
  createRepo,
  runCommand,
  validatePractice,
  graphLayout,
  SCENARIOS,
};

// Aliases for convenience in UI
export const runTask = validatePractice;
