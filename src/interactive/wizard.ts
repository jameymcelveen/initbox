import chalk from 'chalk';
import inquirer from 'inquirer';
import type { ResolvedFormula, FormulaTask } from '../types/index.js';
import { formulaParser } from '../parser/index.js';
import { formulaExecutor, type ExecutorOptions } from '../executor/index.js';

/**
 * Check if the current process is running with sudo/root privileges
 */
function isRunningAsSudo(): boolean {
  return process.getuid?.() === 0;
}

/**
 * Check if formula requires sudo and validate privileges
 */
function checkSudoRequirement(formula: ResolvedFormula): boolean {
  if (formula.requireSudo && !isRunningAsSudo()) {
    console.log('');
    console.log(chalk.red('❌ This formula requires sudo privileges to execute.'));
    console.log(chalk.yellow('   Please run the command with sudo:\n'));
    console.log(chalk.cyan(`   sudo ${process.argv.join(' ')}\n`));
    return false;
  }
  return true;
}

interface WizardAnswers {
  formulaUrl: string;
  selectMode: 'all' | 'categories' | 'tasks';
  selectedCategories?: string[];
  selectedTasks?: string[];
  dryRun: boolean;
  continueOnError: boolean;
}

export interface WizardOptions {
  url?: string;
  dryRun?: boolean;
}

/**
 * Interactive setup wizard using inquirer
 */
export async function runInteractiveWizard(options: WizardOptions = {}): Promise<void> {
  console.log('');
  console.log(chalk.bold.magenta('╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║') + chalk.bold.white('         🚀 Dev Setup - Interactive Installer              ') + chalk.bold.magenta('║'));
  console.log(chalk.bold.magenta('╚══════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Get formula URL
  const urlAnswer = await inquirer.prompt<{ formulaUrl: string }>([
    {
      type: 'input',
      name: 'formulaUrl',
      message: '🔗 Enter the URL to your formula YAML file:',
      default: options.url || '',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Please enter a URL';
        }
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
  ]);

  // Fetch and parse the formula
  console.log('');
  console.log(chalk.cyan('📥 Fetching formula...'));
  
  let formula: ResolvedFormula;
  try {
    formula = await formulaParser.fetchAndParse(urlAnswer.formulaUrl);
    console.log(chalk.green(`✅ Loaded: ${formula.name} v${formula.version}`));
    if (formula.description) {
      console.log(chalk.gray(`   ${formula.description}`));
    }
    console.log(chalk.gray(`   ${formula.tasks.length} tasks available`));
    if (formula.requireSudo) {
      console.log(chalk.yellow(`   ⚠️  Requires sudo privileges`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ Failed to fetch formula: ${error}`));
    throw error;
  }

  console.log('');

  // Get selection mode
  const modeAnswer = await inquirer.prompt<{ selectMode: 'all' | 'categories' | 'tasks' }>([
    {
      type: 'list',
      name: 'selectMode',
      message: '📦 What would you like to install?',
      choices: [
        { name: '🌟 Everything (all tasks)', value: 'all' },
        { name: '📁 Select by category', value: 'categories' },
        { name: '🔧 Select individual tasks', value: 'tasks' },
      ],
    },
  ]);

  let selectedCategories: string[] | undefined;
  let selectedTasks: string[] | undefined;

  if (modeAnswer.selectMode === 'categories') {
    const categories = getCategories(formula);
    if (categories.length === 0) {
      console.log(chalk.yellow('⚠️  No categories defined. Falling back to task selection.'));
      modeAnswer.selectMode = 'tasks';
    } else {
      const catAnswer = await inquirer.prompt<{ selectedCategories: string[] }>([
        {
          type: 'checkbox',
          name: 'selectedCategories',
          message: '📁 Select categories to install:',
          choices: categories.map(cat => ({
            name: `${cat} (${getTasksInCategory(formula, cat).length} tasks)`,
            value: cat,
          })),
          validate: (input: string[]) => {
            if (input.length === 0) {
              return 'Please select at least one category';
            }
            return true;
          },
        },
      ]);
      selectedCategories = catAnswer.selectedCategories;
    }
  }

  if (modeAnswer.selectMode === 'tasks') {
    const taskAnswer = await inquirer.prompt<{ selectedTasks: string[] }>([
      {
        type: 'checkbox',
        name: 'selectedTasks',
        message: '🔧 Select tasks to install:',
        choices: formula.tasks.map(task => ({
          name: `${task.name}${task.description ? chalk.gray(` - ${task.description}`) : ''}`,
          value: task.id,
        })),
        validate: (input: string[]) => {
          if (input.length === 0) {
            return 'Please select at least one task';
          }
          return true;
        },
      },
    ]);
    selectedTasks = taskAnswer.selectedTasks;
  }

  // Get additional options
  const optionsAnswer = await inquirer.prompt<{ dryRun: boolean; continueOnError: boolean }>([
    {
      type: 'confirm',
      name: 'dryRun',
      message: '🧪 Dry run? (show what would be installed without executing)',
      default: options.dryRun || false,
    },
    {
      type: 'confirm',
      name: 'continueOnError',
      message: '⚠️  Continue on errors?',
      default: false,
    },
  ]);

  // Check sudo requirement before executing (skip for dry run)
  if (!optionsAnswer.dryRun && !checkSudoRequirement(formula)) {
    process.exit(1);
  }

  // Show sudo warning if required
  if (formula.requireSudo) {
    console.log(chalk.yellow('\n⚠️  This formula requires sudo privileges. You may be prompted for your password.\n'));
  }

  const execOptions: ExecutorOptions = {
    selectedTasks,
    selectedCategories,
    dryRun: optionsAnswer.dryRun,
    verbose: false,
    continueOnError: optionsAnswer.continueOnError,
  };

  await formulaExecutor.execute(formula, execOptions);
}

function getCategories(formula: ResolvedFormula): string[] {
  const categories = new Set<string>();
  formula.tasks.forEach(task => {
    if (task.category) {
      categories.add(task.category);
    }
  });
  return Array.from(categories).sort();
}

function getTasksInCategory(formula: ResolvedFormula, category: string): FormulaTask[] {
  return formula.tasks.filter(task => task.category === category);
}
