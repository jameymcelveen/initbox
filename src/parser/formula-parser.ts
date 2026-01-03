import yaml from 'js-yaml';
import type { 
  Formula, 
  TaskReference, 
  TaskDefinition, 
  FormulaTask, 
  ResolvedFormula,
  InstallStep 
} from '../types/index.js';
import { 
  getTask, 
  getAvailableTaskIds, 
  hasTask,
  type TaskInfo 
} from '../tasks/index.js';

/**
 * Validates and parses a Formula from raw YAML content
 */
export class FormulaParser {
  /**
   * Parse YAML string into a Formula object (with task references)
   */
  parse(yamlContent: string): Formula {
    const raw = yaml.load(yamlContent) as Record<string, unknown>;
    
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid YAML: expected an object');
    }

    return this.validateFormula(raw);
  }

  /**
   * Download and parse a formula from a URL, then resolve all task definitions
   */
  async fetchAndParse(url: string): Promise<ResolvedFormula> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch formula from ${url}: ${response.status} ${response.statusText}`);
    }

    const yamlContent = await response.text();
    const formula = this.parse(yamlContent);

    // Determine where to load tasks from
    const tasksSource = formula.tasksUrl || 'builtin';
    
    let resolvedTasks: FormulaTask[];
    
    if (tasksSource === 'builtin') {
      // Load from bundled TypeScript tasks
      resolvedTasks = this.resolveBuiltinTasks(formula.tasks);
    } else {
      // Load from remote URL
      resolvedTasks = await this.resolveRemoteTasks(formula.tasks, tasksSource);
    }

    return {
      name: formula.name,
      version: formula.version,
      description: formula.description,
      author: formula.author,
      updated: formula.updated,
      tasks: resolvedTasks,
      categories: formula.categories,
      variables: formula.variables,
      requireSudo: formula.requireSudo,
    };
  }

  /**
   * Get list of all available bundled task IDs
   */
  getAvailableTasks(): string[] {
    return getAvailableTaskIds();
  }

  /**
   * Get a single bundled task definition
   */
  getBundledTask(taskId: string): TaskDefinition | null {
    const task = getTask(taskId);
    if (!task) return null;
    
    const info = task.getDefinition();
    return {
      id: info.id,
      name: info.name,
      description: info.description,
      homepage: info.homepage,
      steps: info.steps,
      dependencies: info.dependencies,
      tags: info.tags,
    };
  }

  /**
   * Resolve task references using bundled TypeScript tasks
   */
  private resolveBuiltinTasks(taskRefs: TaskReference[]): FormulaTask[] {
    const resolvedTasks: FormulaTask[] = [];

    for (const ref of taskRefs) {
      if (!hasTask(ref.id)) {
        throw new Error(
          `Bundled task "${ref.id}" not found. Available tasks: ${this.getAvailableTasks().join(', ')}`
        );
      }

      const task = getTask(ref.id)!;
      const info = task.getDefinition();

      resolvedTasks.push({
        id: info.id,
        name: info.name,
        description: info.description,
        homepage: info.homepage,
        steps: info.steps,
        dependencies: info.dependencies,
        tags: info.tags,
        category: ref.category,
        version: ref.version,
      });
    }

    return resolvedTasks;
  }

  /**
   * Resolve task references from remote URLs (for custom tasks)
   */
  private async resolveRemoteTasks(
    taskRefs: TaskReference[], 
    tasksBaseUrl: string
  ): Promise<FormulaTask[]> {
    const resolvedTasks: FormulaTask[] = [];

    for (const ref of taskRefs) {
      // First try bundled tasks
      if (hasTask(ref.id)) {
        const task = getTask(ref.id)!;
        const info = task.getDefinition();
        resolvedTasks.push({
          ...info,
          category: ref.category,
          version: ref.version,
        });
        continue;
      }

      // Fall back to remote fetch
      const taskUrl = `${tasksBaseUrl}/${ref.id}/task.yaml`;
      
      try {
        const response = await fetch(taskUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch task ${ref.id}: ${response.status}`);
        }

        const taskYaml = await response.text();
        const taskDef = this.parseRemoteTaskDefinition(taskYaml);

        resolvedTasks.push({
          ...taskDef,
          category: ref.category,
          version: ref.version,
        });
      } catch (error) {
        throw new Error(`Failed to load task "${ref.id}" from ${taskUrl}: ${error}`);
      }
    }

    return resolvedTasks;
  }

  /**
   * Parse a remote task definition YAML
   */
  private parseRemoteTaskDefinition(yamlContent: string): TaskDefinition {
    const raw = yaml.load(yamlContent) as Record<string, unknown>;
    
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid task YAML: expected an object');
    }

    return this.validateTaskDefinition(raw);
  }

  private validateFormula(raw: Record<string, unknown>): Formula {
    if (!raw.name || typeof raw.name !== 'string') {
      throw new Error('Formula must have a "name" field');
    }

    if (!raw.version || typeof raw.version !== 'string') {
      throw new Error('Formula must have a "version" field');
    }

    if (!Array.isArray(raw.tasks)) {
      throw new Error('Formula must have a "tasks" array');
    }

    const tasks = raw.tasks.map((task, index) => this.validateTaskReference(task, index));

    return {
      name: raw.name,
      version: raw.version,
      description: raw.description as string | undefined,
      author: raw.author as string | undefined,
      updated: raw.updated as string | undefined,
      minVersion: raw.minVersion as string | undefined,
      tasksUrl: raw.tasksUrl as string | undefined,
      tasks,
      categories: raw.categories as string[] | undefined,
      variables: raw.variables as Record<string, string> | undefined,
      requireSudo: (raw as Record<string, unknown>)['require-sudo'] as boolean | undefined,
    };
  }

  private validateTaskReference(raw: unknown, index: number): TaskReference {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Task at index ${index} must be an object`);
    }

    const task = raw as Record<string, unknown>;

    if (!task.id || typeof task.id !== 'string') {
      throw new Error(`Task at index ${index} must have an "id" field`);
    }

    if (!task.category || typeof task.category !== 'string') {
      throw new Error(`Task at index ${index} must have a "category" field`);
    }

    return {
      id: task.id,
      category: task.category,
      version: task.version as string | undefined,
    };
  }

  private validateTaskDefinition(raw: Record<string, unknown>): TaskDefinition {
    if (!raw.id || typeof raw.id !== 'string') {
      throw new Error('Task definition must have an "id" field');
    }

    if (!raw.name || typeof raw.name !== 'string') {
      throw new Error('Task definition must have a "name" field');
    }

    if (!Array.isArray(raw.steps)) {
      throw new Error(`Task "${raw.id}" must have a "steps" array`);
    }

    const steps = raw.steps.map((step, stepIndex) => 
      this.validateStep(step, raw.id as string, stepIndex)
    );

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description as string | undefined,
      homepage: raw.homepage as string | undefined,
      steps,
      dependencies: raw.dependencies as string[] | undefined,
      tags: raw.tags as string[] | undefined,
    };
  }

  private validateStep(raw: unknown, taskId: string, index: number): InstallStep {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Step ${index} of "${taskId}" must be an object`);
    }

    const step = raw as Record<string, unknown>;

    if (!step.name || typeof step.name !== 'string') {
      throw new Error(`Step ${index} of "${taskId}" must have a "name" field`);
    }

    if (!step.type || typeof step.type !== 'string') {
      throw new Error(`Step ${index} of "${taskId}" must have a "type" field`);
    }

    const validTypes = ['brew', 'npm', 'apt', 'shell', 'curl', 'git', 'pip'];
    if (!validTypes.includes(step.type)) {
      throw new Error(`Step ${index} of "${taskId}" has invalid type "${step.type}". Valid types: ${validTypes.join(', ')}`);
    }

    if (!step.command || typeof step.command !== 'string') {
      throw new Error(`Step ${index} of "${taskId}" must have a "command" field`);
    }

    return {
      name: step.name,
      type: step.type as InstallStep['type'],
      command: step.command,
      args: step.args as string[] | undefined,
      optional: step.optional as boolean | undefined,
      platforms: step.platforms as string[] | undefined,
      env: step.env as Record<string, string> | undefined,
      cwd: step.cwd as string | undefined,
      postInstall: step.postInstall as string[] | undefined,
    };
  }
}

export const formulaParser = new FormulaParser();
