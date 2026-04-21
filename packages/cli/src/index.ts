#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand, initMultiCommand } from './commands/init';
import { setupCommand } from './commands/setup';
import { switchCommand } from './commands/switch';
import { listCommand } from './commands/list';
import { currentCommand } from './commands/current';
import { statusCommand } from './commands/status';
import { validateCommand } from './commands/validate';
import { refineCommand } from './commands/refine';
import { startPlanCommand } from './commands/startPlan';
import { completeStepCommand } from './commands/completeStep';
import { summariseCommand } from './commands/summarise';
import { weaveIdeaCommand } from './commands/weaveIdea';
import { weaveDesignCommand } from './commands/weaveDesign';
import { weavePlanCommand } from './commands/weavePlan';
import { finalizeCommand } from './commands/finalize';
import { renameCommand } from './commands/rename';

const program = new Command();

program
    .name('loom')
    .description('REslava Loom — Weave ideas into features with AI')
    .version('0.1.0');

// ----------------------------------------------------------------------------
// Init Command (Mono‑Loom)
// ----------------------------------------------------------------------------
program
    .command('init')
    .description('Initialize a mono‑loom workspace in the current directory')
    .option('--force', 'Overwrite existing configuration')
    .action(initCommand);

// ----------------------------------------------------------------------------
// Init-Multi Command (Global Multi‑Loom)
// ----------------------------------------------------------------------------
program
    .command('init-multi')
    .description('Initialize the global multi‑loom workspace at ~/looms/default')
    .option('--force', 'Overwrite existing configuration')
    .action((options) => initMultiCommand(options));

// ----------------------------------------------------------------------------
// Setup Command
// ----------------------------------------------------------------------------
program
    .command('setup <name>')
    .description('Create a new named Loom workspace')
    .option('--path <path>', 'Custom path for the loom')
    .option('--no-switch', 'Do not set as active loom after creation')
    .action(setupCommand);

// ----------------------------------------------------------------------------
// Switch Command
// ----------------------------------------------------------------------------
program
    .command('switch <name>')
    .description('Switch the active loom context')
    .action(switchCommand);

// ----------------------------------------------------------------------------
// List Command
// ----------------------------------------------------------------------------
program
    .command('list')
    .description('List all registered looms')
    .action(listCommand);

// ----------------------------------------------------------------------------
// Current Command
// ----------------------------------------------------------------------------
program
    .command('current')
    .description('Show the currently active loom')
    .action(currentCommand);

// ----------------------------------------------------------------------------
// Status Command
// ----------------------------------------------------------------------------
program
    .command('status [thread-id]')
    .description('Show derived state of threads')
    .option('--verbose', 'Show detailed status including plan steps')
    .option('--json', 'Output as JSON')
    .option('--tokens', 'Show token usage (placeholder)')
    .option('--filter <criteria>', 'Filter threads (e.g., status=active|implementing,phase=planning)')
    .option('--sort <order>', 'Sort threads (e.g., id:asc, id:desc)')
    .action(statusCommand);

// ----------------------------------------------------------------------------
// Validate Command
// ----------------------------------------------------------------------------
program
    .command('validate [thread-id]')
    .description('Validate document integrity')
    .option('--all', 'Validate all threads')
    .option('--fix', 'Attempt to fix issues (not yet implemented)')
    .option('--verbose', 'Show detailed issues')
    .action(validateCommand);

// ----------------------------------------------------------------------------
// Refine Design Command
// ----------------------------------------------------------------------------
program
    .command('refine-design <thread-id>')
    .description('Fire REFINE_DESIGN event')
    .action(refineCommand);

// ----------------------------------------------------------------------------
// Start Plan Command
// ----------------------------------------------------------------------------
program
    .command('start-plan <plan-id>')
    .description('Fire START_PLAN event')
    .action(startPlanCommand);

// ----------------------------------------------------------------------------
// Complete Step Command
// ----------------------------------------------------------------------------
program
    .command('complete-step <plan-id>')
    .description('Mark a plan step as done')
    .requiredOption('--step <n>', 'Step number to complete')
    .action(completeStepCommand);

// ----------------------------------------------------------------------------
// Summarise Context Command
// ----------------------------------------------------------------------------
program
    .command('summarise-context <thread-id>')
    .description('Generate or regenerate -ctx.md summary')
    .option('--force', 'Overwrite existing summary')
    .action(summariseCommand);

// ----------------------------------------------------------------------------
// Weave Commands (nested)
// ----------------------------------------------------------------------------
const weaveCmd = program
    .command('weave')
    .description('Weave a new document');

weaveCmd
    .command('idea <title>')
    .description('Create a new idea document')
    .option('--weave <name>', 'Place the idea in a specific weave folder')
    .action((title, options) => weaveIdeaCommand(title, options));

weaveCmd
    .command('design <thread-id>')
    .description('Create a new design document from an existing idea')
    .option('--title <title>', 'Custom title for the design')
    .action((weaveId, options) => weaveDesignCommand(weaveId, options));

weaveCmd
    .command('plan <thread-id>')
    .description('Create a new plan from a finalized design')
    .option('--title <title>', 'Custom title for the plan')
    .option('--goal <goal>', 'Goal description for the plan')
    .action((weaveId, options) => weavePlanCommand(weaveId, options));

// ----------------------------------------------------------------------------
// Finalize Command
// ----------------------------------------------------------------------------
program
    .command('finalize <temp-id>')
    .description('Finalize a draft document and generate its permanent ID')
    .action(finalizeCommand);

// ----------------------------------------------------------------------------
// Rename Command
// ----------------------------------------------------------------------------
program
    .command('rename <old-id> <new-title>')
    .description('Rename a finalized document and update all references')
    .action(renameCommand);

program.parse(process.argv);