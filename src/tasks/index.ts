/**
 * Task Registry - exports all bundled tasks
 */

import type { ITask, TaskInfo } from './base.js';
import Task from './task.js';

// Import all task YAML files
import gitYaml from './git/task.yaml?raw';
import ghYaml from './gh/task.yaml?raw';
import curlYaml from './curl/task.yaml?raw';
import jqYaml from './jq/task.yaml?raw';
import nvmYaml from './nvm/task.yaml?raw';
import nodeLtsYaml from './node-lts/task.yaml?raw';
import pnpmYaml from './pnpm/task.yaml?raw';
import bunYaml from './bun/task.yaml?raw';
import pythonYaml from './python/task.yaml?raw';
import poetryYaml from './poetry/task.yaml?raw';
import postgresqlYaml from './postgresql/task.yaml?raw';
import redisYaml from './redis/task.yaml?raw';
import dockerYaml from './docker/task.yaml?raw';
import kubectlYaml from './kubectl/task.yaml?raw';
import terraformYaml from './terraform/task.yaml?raw';
import fzfYaml from './fzf/task.yaml?raw';
import ripgrepYaml from './ripgrep/task.yaml?raw';
import batYaml from './bat/task.yaml?raw';
import ezaYaml from './eza/task.yaml?raw';
import lazygitYaml from './lazygit/task.yaml?raw';
import helloYaml from './hello/task.yaml?raw';

// Re-export base class and interface
export { BaseTask, type ITask, type TaskInfo, type VersionCheckResult } from './base.js';

/**
 * Registry of all bundled tasks keyed by ID
 */
export const taskRegistry: Record<string, ITask> = {
  git: Task.fromYaml(gitYaml),
  gh: Task.fromYaml(ghYaml),
  curl: Task.fromYaml(curlYaml),
  jq: Task.fromYaml(jqYaml),
  nvm: Task.fromYaml(nvmYaml),
  'node-lts': Task.fromYaml(nodeLtsYaml),
  pnpm: Task.fromYaml(pnpmYaml),
  bun: Task.fromYaml(bunYaml),
  python: Task.fromYaml(pythonYaml),
  poetry: Task.fromYaml(poetryYaml),
  postgresql: Task.fromYaml(postgresqlYaml),
  redis: Task.fromYaml(redisYaml),
  docker: Task.fromYaml(dockerYaml),
  kubectl: Task.fromYaml(kubectlYaml),
  terraform: Task.fromYaml(terraformYaml),
  fzf: Task.fromYaml(fzfYaml),
  ripgrep: Task.fromYaml(ripgrepYaml),
  bat: Task.fromYaml(batYaml),
  eza: Task.fromYaml(ezaYaml),
  lazygit: Task.fromYaml(lazygitYaml),
  hello: Task.fromYaml(helloYaml),
};

/**
 * Get a task by ID
 */
export function getTask(id: string): ITask | undefined {
  return taskRegistry[id];
}

/**
 * Get task definition by ID
 */
export function getTaskDefinition(id: string): TaskInfo | undefined {
  const task = taskRegistry[id];
  return task?.getDefinition();
}

/**
 * Get all available task IDs
 */
export function getAvailableTaskIds(): string[] {
  return Object.keys(taskRegistry);
}

/**
 * Get all task definitions
 */
export function getAllTaskDefinitions(): TaskInfo[] {
  return Object.values(taskRegistry).map(task => task.getDefinition());
}

/**
 * Check if a task exists
 */
export function hasTask(id: string): boolean {
  return id in taskRegistry;
}
