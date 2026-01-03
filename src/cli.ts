import { Command } from 'commander';
import chalk from 'chalk';
import { formulaParser } from './parser/index.js';
import { formulaExecutor, type ExecutorOptions } from './executor/index.js';
import { runInteractiveWizard } from './interactive/index.js';
import type { ResolvedFormula } from './types/index.js';

const VERSION = '1.0.0';

/**
 * Check if the current process is running with sudo/root privileges
 */
function isRunningAsSudo(): boolean {
  return process.getuid?.() === 0;
}

/**
 * Check if formula requires sudo and validate privileges
 */
function checkSudoRequirement(formula: ResolvedFormula): void {
  if (formula.requireSudo && !isRunningAsSudo()) {
    console.error(chalk.red('\n❌ This formula requires sudo privileges to execute.'));
    console.error(chalk.yellow('   Please run the command with sudo:\n'));
    console.error(chalk.cyan(`   sudo ${process.argv.join(' ')}\n`));
    process.exit(1);
  }
}

const program = new Command();

// ASCII Art Banner
const banner = `
${chalk.bold.hex('#FF6B6B')('  ╔═══════════════════════════════════════════════════════════╗')}
${chalk.bold.hex('#FF6B6B')('  ║')} ${chalk.bold.white('      ____             ____       _               ')}    ${chalk.bold.hex('#FF6B6B')('║')}
${chalk.bold.hex('#FF6B6B')('  ║')} ${chalk.bold.hex('#4ECDC4')('     |  _ \\  _____   __/ ___|  ___| |_ _   _ _ __ ')}    ${chalk.bold.hex('#FF6B6B')('║')}
${chalk.bold.hex('#FF6B6B')('  ║')} ${chalk.bold.hex('#4ECDC4')("     | | | |/ _ \\ \\ / /\\___ \\ / _ \\ __| | | | '_ \\ ")}   ${chalk.bold.hex('#FF6B6B')('║')}
${chalk.bold.hex('#FF6B6B')('  ║')} ${chalk.bold.hex('#4ECDC4')('     | |_| |  __/\\ V /  ___) |  __/ |_| |_| | |_) |')}   ${chalk.bold.hex('#FF6B6B')('║')}
${chalk.bold.hex('#FF6B6B')('  ║')} ${chalk.bold.hex('#4ECDC4')('     |____/ \\___| \\_/  |____/ \\___|\\__|\\__,_| .__/ ')}   ${chalk.bold.hex('#FF6B6B')('║')}
${chalk.bold.hex('#FF6B6B')('  ║')} ${chalk.bold.hex('#4ECDC4')('                                            |_|    ')}   ${chalk.bold.hex('#FF6B6B')('║')}
${chalk.bold.hex('#FF6B6B')('  ╚═══════════════════════════════════════════════════════════╝')}
${chalk.gray('           Install apps & tools from YAML formulas')}
`;

program
  .name('initbox')
  .version(VERSION)
  .description('Install apps and tools based on YAML formulas from the web')
  .addHelpText('before', banner);

// Interactive command (default)
program
  .command('interactive')
  .alias('i')
  .description('Run interactive setup wizard')
  .option('-u, --url <url>', 'Formula URL to use')
  .option('--dry-run', 'Show what would be installed without executing')
  .action(async (options) => {
    console.log(banner);
    
    try {
      await runInteractiveWizard({
        url: options.url,
        dryRun: options.dryRun,
      });
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Install command (non-interactive)
program
  .command('install <url>')
  .alias('in')
  .description('Install from a formula URL')
  .option('-t, --tasks <tasks...>', 'Specific task IDs to install')
  .option('-c, --categories <categories...>', 'Categories to install')
  .option('--dry-run', 'Show what would be installed without executing')
  .option('--verbose', 'Show detailed output')
  .option('--continue-on-error', 'Continue installation even if some tasks fail')
  .option('-f, --force', 'Force reinstall even if already installed')
  .option('--skip-version-check', 'Skip version checking')
  .action(async (url: string, options) => {
    console.log(banner);
    
    try {
      console.log(chalk.cyan('📥 Fetching formula...'));
      const formula = await formulaParser.fetchAndParse(url);
      console.log(chalk.green(`✅ Loaded: ${formula.name} v${formula.version}\n`));

      // Check if formula requires sudo
      if (!options.dryRun) {
        checkSudoRequirement(formula);
      }

      const execOptions: ExecutorOptions = {
        selectedTasks: options.tasks,
        selectedCategories: options.categories,
        dryRun: options.dryRun,
        verbose: options.verbose,
        continueOnError: options.continueOnError,
        forceInstall: options.force,
        skipVersionCheck: options.skipVersionCheck,
      };

      await formulaExecutor.execute(formula, execOptions);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Inspect command
program
  .command('inspect <url>')
  .alias('show')
  .description('Inspect a formula without installing')
  .action(async (url: string) => {
    console.log(banner);
    
    try {
      console.log(chalk.cyan('📥 Fetching formula...\n'));
      const formula = await formulaParser.fetchAndParse(url);

      console.log(chalk.bold.white('📦 Formula Details'));
      console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.white(`  Name:        ${chalk.bold(formula.name)}`));
      console.log(chalk.white(`  Version:     ${formula.version}`));
      if (formula.description) {
        console.log(chalk.white(`  Description: ${formula.description}`));
      }
      if (formula.author) {
        console.log(chalk.white(`  Author:      ${formula.author}`));
      }
      console.log(chalk.white(`  Tasks:       ${formula.tasks.length}`));
      if (formula.requireSudo) {
        console.log(chalk.yellow(`  Sudo:        Required ⚠️`));
      }
      
      if (formula.categories && formula.categories.length > 0) {
        console.log(chalk.white(`  Categories:  ${formula.categories.join(', ')}`));
      }

      console.log('');
      console.log(chalk.bold.white('🔧 Available Tasks'));
      console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

      // Group by category
      const byCategory = new Map<string, typeof formula.tasks>();
      formula.tasks.forEach(task => {
        const cat = task.category || 'Uncategorized';
        if (!byCategory.has(cat)) {
          byCategory.set(cat, []);
        }
        byCategory.get(cat)!.push(task);
      });

      for (const [category, tasks] of byCategory) {
        console.log(chalk.cyan(`\n  📁 ${category}`));
        tasks.forEach(task => {
          console.log(chalk.white(`     • ${chalk.bold(task.id)}: ${task.name}`));
          if (task.description) {
            console.log(chalk.gray(`       ${task.description}`));
          }
          console.log(chalk.gray(`       Steps: ${task.steps.length} | Tags: ${task.tags?.join(', ') || 'none'}`));
        });
      }

      console.log('');
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate <url>')
  .description('Validate a formula YAML file')
  .action(async (url: string) => {
    console.log(banner);
    
    try {
      console.log(chalk.cyan('🔍 Validating formula...\n'));
      const formula = await formulaParser.fetchAndParse(url);

      console.log(chalk.green('✅ Formula is valid!\n'));
      console.log(chalk.white(`  Name:    ${formula.name}`));
      console.log(chalk.white(`  Version: ${formula.version}`));
      console.log(chalk.white(`  Tasks:   ${formula.tasks.length}`));

      // Validate dependencies
      const taskIds = new Set(formula.tasks.map(t => t.id));
      let hasDepErrors = false;

      formula.tasks.forEach(task => {
        if (task.dependencies) {
          task.dependencies.forEach(dep => {
            if (!taskIds.has(dep)) {
              console.log(chalk.yellow(`  ⚠️  ${task.id} depends on unknown task: ${dep}`));
              hasDepErrors = true;
            }
          });
        }
      });

      if (!hasDepErrors) {
        console.log(chalk.green('\n  ✅ All dependencies are valid'));
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Validation failed: ${error}`));
      process.exit(1);
    }
  });

// Default to interactive if no command provided
if (process.argv.length <= 2) {
  program.parse(['', '', 'interactive']);
} else {
  program.parse();
}
