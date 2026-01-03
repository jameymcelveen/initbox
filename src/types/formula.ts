/**
 * Represents a single installation step in a formula
 */
export interface InstallStep {
  /** Name of the step for display */
  name: string;
  /** Type of installation command */
  type: 'brew' | 'npm' | 'apt' | 'shell' | 'curl' | 'git' | 'pip';
  /** The package name or command to execute */
  command: string;
  /** Additional arguments for the command */
  args?: string[];
  /** Whether this step is optional */
  optional?: boolean;
  /** Platform requirements (darwin, linux, win32) */
  platforms?: string[];
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Working directory for the command */
  cwd?: string;
  /** Post-install commands */
  postInstall?: string[];
}

/**
 * Task reference in the main formula (minimal info)
 * Full task details are loaded from tasks/{id}/task.yaml
 */
export interface TaskReference {
  /** Unique identifier for the task (also folder name) */
  id: string;
  /** Category for grouping */
  category: string;
  /** Version of the task definition */
  version?: string;
}

/**
 * Full task definition stored in tasks/{id}/task.yaml
 */
export interface TaskDefinition {
  /** Unique identifier for the task */
  id: string;
  /** Display name */
  name: string;
  /** Description of what this tool does */
  description?: string;
  /** Homepage URL */
  homepage?: string;
  /** Installation steps */
  steps: InstallStep[];
  /** Dependencies that must be installed first (task IDs) */
  dependencies?: string[];
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Resolved task with full definition and category from formula
 */
export interface FormulaTask extends TaskDefinition {
  /** Category for grouping (from formula reference) */
  category: string;
  /** Version (from formula reference) */
  version?: string;
}

/**
 * Main formula structure downloaded from YAML
 */
export interface Formula {
  /** Formula name */
  name: string;
  /** Formula version */
  version: string;
  /** Description */
  description?: string;
  /** Author information */
  author?: string;
  /** Last updated timestamp */
  updated?: string;
  /** Minimum initbox version required */
  minVersion?: string;
  /** Base URL for loading task definitions */
  tasksUrl?: string;
  /** Task references to install */
  tasks: TaskReference[];
  /** Categories available in this formula */
  categories?: string[];
  /** Variables that can be customized */
  variables?: Record<string, string>;
  /** Whether this formula requires sudo/root privileges to execute */
  requireSudo?: boolean;
}

/**
 * Resolved formula with full task definitions loaded
 */
export interface ResolvedFormula {
  /** Formula name */
  name: string;
  /** Formula version */
  version: string;
  /** Description */
  description?: string;
  /** Author information */
  author?: string;
  /** Last updated timestamp */
  updated?: string;
  /** Fully resolved tasks with definitions */
  tasks: FormulaTask[];
  /** Categories available in this formula */
  categories?: string[];
  /** Variables that can be customized */
  variables?: Record<string, string>;
  /** Whether this formula requires sudo/root privileges to execute */
  requireSudo?: boolean;
}

/**
 * Result of an installation step
 */
export interface StepResult {
  step: InstallStep;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
}

/**
 * Result of installing a formula task
 */
export interface TaskResult {
  task: FormulaTask;
  success: boolean;
  steps: StepResult[];
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Overall installation result
 */
export interface InstallResult {
  formula: ResolvedFormula;
  success: boolean;
  tasks: TaskResult[];
  startTime: Date;
  endTime: Date;
  totalDuration: number;
}
