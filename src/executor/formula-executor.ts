import chalk from 'chalk';
import ora from 'ora';
import type { ResolvedFormula, FormulaTask, InstallResult, TaskResult, StepResult } from '../types/index.js';
import { stepExecutor } from './step-executor.js';
import { getTask } from '../tasks/index.js';

export interface ExecutorOptions {
  /** Tasks to install (by ID). If empty, install all */
  selectedTasks?: string[];
  /** Categories to install. If empty, install all */
  selectedCategories?: string[];
  /** Dry run - don't actually execute commands */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Continue on error */
  continueOnError?: boolean;
  /** Force reinstall even if already installed */
  forceInstall?: boolean;
  /** Skip version checking */
  skipVersionCheck?: boolean;
}

/**
 * Executes a complete formula installation
 */
export class FormulaExecutor {
  private installedTasks: Set<string> = new Set();

  /**
   * Execute a formula installation
   */
  async execute(formula: ResolvedFormula, options: ExecutorOptions = {}): Promise<InstallResult> {
    const startTime = new Date();
    const taskResults: TaskResult[] = [];
    
    console.log('');
    console.log(chalk.bold.cyan('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.white(`  📦 ${formula.name} v${formula.version}`.padEnd(62)) + chalk.bold.cyan('║'));
    if (formula.description) {
      console.log(chalk.bold.cyan('║') + chalk.gray(`  ${formula.description.slice(0, 60)}`.padEnd(62)) + chalk.bold.cyan('║'));
    }
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════════════╝'));
    console.log('');

    // Filter tasks based on options
    const tasksToInstall = this.filterTasks(formula, options);

    if (tasksToInstall.length === 0) {
      console.log(chalk.yellow('⚠️  No tasks selected for installation'));
      return {
        formula,
        success: true,
        tasks: [],
        startTime,
        endTime: new Date(),
        totalDuration: Date.now() - startTime.getTime(),
      };
    }

    console.log(chalk.white(`📋 Processing ${chalk.bold(tasksToInstall.length)} tasks...\n`));

    // Sort by dependencies
    const sortedTasks = this.topologicalSort(tasksToInstall);

    for (const task of sortedTasks) {
      const result = await this.executeTask(task, options);
      taskResults.push(result);

      if (result.success || result.skipped) {
        this.installedTasks.add(task.id);
      } else if (!options.continueOnError) {
        console.log(chalk.red(`\n❌ Installation failed. Use --continue-on-error to proceed anyway.`));
        break;
      }
    }

    const endTime = new Date();
    const success = taskResults.every(r => r.success || r.skipped);

    // Print summary
    this.printSummary(taskResults);

    return {
      formula,
      success,
      tasks: taskResults,
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * Execute a single formula task
   */
  private async executeTask(task: FormulaTask, options: ExecutorOptions): Promise<TaskResult> {
    const stepResults: StepResult[] = [];

    // Check dependencies
    if (task.dependencies) {
      const missingDeps = task.dependencies.filter(dep => !this.installedTasks.has(dep));
      if (missingDeps.length > 0) {
        console.log(chalk.yellow(`⏭️  Skipping ${chalk.bold(task.name)}: missing dependencies [${missingDeps.join(', ')}]`));
        return {
          task,
          success: false,
          steps: [],
          skipped: true,
          skipReason: `Missing dependencies: ${missingDeps.join(', ')}`,
        };
      }
    }

    // Check version before installing (unless forced or skipped)
    if (!options.forceInstall && !options.skipVersionCheck && !options.dryRun) {
      const versionCheck = await this.checkTaskVersion(task);
      
      if (versionCheck.installed && !versionCheck.needsUpdate) {
        console.log(chalk.cyan(`✓ ${chalk.bold(task.name)}: ${versionCheck.message}`));
        return {
          task,
          success: true,
          steps: [],
          skipped: true,
          skipReason: versionCheck.message,
        };
      }
      
      if (versionCheck.installed && versionCheck.needsUpdate) {
        console.log(chalk.yellow(`⬆️  ${chalk.bold(task.name)}: ${versionCheck.message} - updating...`));
      }
    }

    console.log(chalk.blue(`\n┌─ ${chalk.bold(task.name)}`));
    if (task.description) {
      console.log(chalk.gray(`│  ${task.description}`));
    }

    for (const step of task.steps) {
      const spinner = ora({
        text: `${step.name}`,
        prefixText: chalk.blue('│'),
      }).start();

      if (options.dryRun) {
        spinner.succeed(chalk.gray(`${step.name} (dry run)`));
        stepResults.push({
          step,
          success: true,
          output: 'Dry run - no action taken',
          duration: 0,
        });
        continue;
      }

      const result = await stepExecutor.execute(step);
      stepResults.push(result);

      if (result.success) {
        spinner.succeed(`${step.name}`);
        if (options.verbose && result.output) {
          console.log(chalk.gray(`│    ${result.output.split('\n').slice(0, 3).join('\n│    ')}`));
        }
      } else {
        if (step.optional) {
          spinner.warn(chalk.yellow(`${step.name} (optional, failed)`));
        } else {
          spinner.fail(chalk.red(`${step.name}`));
          if (result.error) {
            console.log(chalk.red(`│    Error: ${result.error.split('\n')[0]}`));
          }
          return {
            task,
            success: false,
            steps: stepResults,
          };
        }
      }
    }

    // Verify installation by checking version after install
    const postCheck = await this.checkTaskVersion(task);
    if (postCheck.installed) {
      const versionInfo = postCheck.currentVersion ? ` v${postCheck.currentVersion}` : '';
      console.log(chalk.green(`└─ ✅ ${task.name}${versionInfo} installed successfully`));
    } else {
      console.log(chalk.green(`└─ ✅ ${task.name} installed successfully`));
    }

    return {
      task,
      success: true,
      steps: stepResults,
    };
  }

  /**
   * Check task version using the task class
   */
  private async checkTaskVersion(task: FormulaTask): Promise<{
    installed: boolean;
    currentVersion?: string;
    needsUpdate: boolean;
    message: string;
  }> {
    const taskInstance = getTask(task.id);
    
    if (!taskInstance) {
      return {
        installed: false,
        needsUpdate: true,
        message: 'Task not found in registry',
      };
    }

    // Use the task's desired version, default to "latest"
    const desiredVersion = task.version || 'latest';
    return taskInstance.checkVersion(desiredVersion);
  }

  /**
   * Filter tasks based on selection options
   */
  private filterTasks(formula: ResolvedFormula, options: ExecutorOptions): FormulaTask[] {
    let tasks = formula.tasks;

    if (options.selectedTasks && options.selectedTasks.length > 0) {
      tasks = tasks.filter(task => options.selectedTasks!.includes(task.id));
    }

    if (options.selectedCategories && options.selectedCategories.length > 0) {
      tasks = tasks.filter(task => 
        task.category && options.selectedCategories!.includes(task.category)
      );
    }

    return tasks;
  }

  /**
   * Topological sort tasks by dependencies
   */
  private topologicalSort(tasks: FormulaTask[]): FormulaTask[] {
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    const visited = new Set<string>();
    const result: FormulaTask[] = [];

    const visit = (task: FormulaTask) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      if (task.dependencies) {
        for (const depId of task.dependencies) {
          const dep = taskMap.get(depId);
          if (dep) {
            visit(dep);
          }
        }
      }

      result.push(task);
    };

    for (const task of tasks) {
      visit(task);
    }

    return result;
  }

  /**
   * Print installation summary
   */
  private printSummary(results: TaskResult[]): void {
    const installed = results.filter(r => r.success && !r.skipped);
    const alreadyInstalled = results.filter(r => r.skipped && r.skipReason?.includes('installed'));
    const failed = results.filter(r => !r.success && !r.skipped);
    const skippedOther = results.filter(r => r.skipped && !r.skipReason?.includes('installed'));

    console.log('');
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold('  📊 Installation Summary'));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    if (installed.length > 0) {
      console.log(chalk.green(`  ✅ Installed/Updated: ${installed.length}`));
      installed.forEach(r => console.log(chalk.green(`     • ${r.task.name}`)));
    }

    if (alreadyInstalled.length > 0) {
      console.log(chalk.cyan(`  ✓ Already installed: ${alreadyInstalled.length}`));
      alreadyInstalled.forEach(r => console.log(chalk.cyan(`     • ${r.task.name}`)));
    }
    
    if (failed.length > 0) {
      console.log(chalk.red(`  ❌ Failed: ${failed.length}`));
      failed.forEach(r => console.log(chalk.red(`     • ${r.task.name}`)));
    }
    
    if (skippedOther.length > 0) {
      console.log(chalk.yellow(`  ⏭️  Skipped: ${skippedOther.length}`));
      skippedOther.forEach(r => console.log(chalk.yellow(`     • ${r.task.name}: ${r.skipReason}`)));
    }

    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
  }
}

export const formulaExecutor = new FormulaExecutor();
