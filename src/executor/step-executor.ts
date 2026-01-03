import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import type { InstallStep, StepResult } from '../types/index.js';

/**
 * Executes individual installation steps
 */
export class StepExecutor {
  private currentPlatform: string;

  constructor() {
    this.currentPlatform = platform();
  }

  /**
   * Check if step should run on current platform
   */
  shouldRunOnPlatform(step: InstallStep): boolean {
    if (!step.platforms || step.platforms.length === 0) {
      return true;
    }
    return step.platforms.includes(this.currentPlatform);
  }

  /**
   * Execute a single installation step
   */
  async execute(step: InstallStep): Promise<StepResult> {
    const startTime = Date.now();

    if (!this.shouldRunOnPlatform(step)) {
      return {
        step,
        success: true,
        output: `Skipped: not applicable for ${this.currentPlatform}`,
        duration: 0,
      };
    }

    try {
      const { command, args } = this.buildCommand(step);
      const output = await this.runCommand(command, args, step.env, step.cwd);

      // Run post-install commands if any
      if (step.postInstall && step.postInstall.length > 0) {
        for (const postCmd of step.postInstall) {
          await this.runCommand('sh', ['-c', postCmd], step.env, step.cwd);
        }
      }

      return {
        step,
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        step,
        success: step.optional ?? false, // Optional steps don't fail the overall install
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Build the command and arguments based on step type
   */
  private buildCommand(step: InstallStep): { command: string; args: string[] } {
    const baseArgs = step.args ?? [];

    switch (step.type) {
      case 'brew':
        return {
          command: 'brew',
          args: ['install', step.command, ...baseArgs],
        };

      case 'npm':
        return {
          command: 'npm',
          args: ['install', '-g', step.command, ...baseArgs],
        };

      case 'pip':
        return {
          command: 'pip3',
          args: ['install', step.command, ...baseArgs],
        };

      case 'apt':
        return {
          command: 'sudo',
          args: ['apt-get', 'install', '-y', step.command, ...baseArgs],
        };

      case 'shell':
        return {
          command: 'sh',
          args: ['-c', step.command, ...baseArgs],
        };

      case 'curl':
        return {
          command: 'sh',
          args: ['-c', `curl -fsSL ${step.command} | sh`, ...baseArgs],
        };

      case 'git':
        return {
          command: 'git',
          args: ['clone', step.command, ...baseArgs],
        };

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Run a shell command and return output
   */
  private runCommand(
    command: string,
    args: string[],
    env?: Record<string, string>,
    cwd?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Command failed with exit code ${code}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }
}

export const stepExecutor = new StepExecutor();

