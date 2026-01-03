import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import type { InstallStep } from '../types/index.js';

/**
 * Result of version check
 */
export interface VersionCheckResult {
  /** Whether the tool is installed */
  installed: boolean;
  /** Currently installed version (undefined if not installed) */
  currentVersion?: string;
  /** Whether an update is needed */
  needsUpdate: boolean;
  /** Message describing the status */
  message: string;
}

/**
 * Task configuration that can be loaded from JSON or YAML
 */
export interface TaskConfig {
  id: string;
  name: string;
  description?: string;
  homepage?: string;
  tags?: string[];
  dependencies?: string[];
  versionCommand?: string;
  /** Regex pattern to extract version from command output. First capture group is the version. */
  versionParseRegex?: string;
  /** Whether this task requires sudo/root privileges to install */
  requireSudo?: boolean;
  steps: InstallStep[];
}

/**
 * Static methods for TaskConfig
 */
export namespace TaskConfig {
  /**
   * Parse a TaskConfig from YAML text
   */
  export function fromYaml(yamlText: string): TaskConfig {
    const parsed = yaml.load(yamlText) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML: expected an object');
    }
    if (!parsed.id || typeof parsed.id !== 'string') {
      throw new Error('Invalid TaskConfig: missing or invalid "id"');
    }
    if (!parsed.name || typeof parsed.name !== 'string') {
      throw new Error('Invalid TaskConfig: missing or invalid "name"');
    }
    if (!Array.isArray(parsed.steps)) {
      throw new Error('Invalid TaskConfig: missing or invalid "steps" array');
    }
    
    // Map hyphenated YAML keys to camelCase
    return {
      id: parsed.id as string,
      name: parsed.name as string,
      description: parsed.description as string | undefined,
      homepage: parsed.homepage as string | undefined,
      tags: parsed.tags as string[] | undefined,
      dependencies: parsed.dependencies as string[] | undefined,
      versionCommand: parsed.versionCommand as string | undefined,
      versionParseRegex: parsed.versionParseRegex as string | undefined,
      requireSudo: parsed['require-sudo'] as boolean | undefined,
      steps: parsed.steps as InstallStep[],
    };
  }
}

/**
 * Interface that all task classes must implement
 */
export interface ITask {
  /** Unique identifier for the task */
  getId(): string;
  
  /** Display name */
  getName(): string;
  
  /** Description of what this tool does */
  getDescription(): string | undefined;
  
  /** Homepage URL */
  getHomepage(): string | undefined;
  
  /** Tags for filtering */
  getTags(): string[];
  
  /** Dependencies that must be installed first (task IDs) */
  getDependencies(): string[];
  
  /** Installation steps */
  getSteps(): InstallStep[];

  /** Get the complete task definition as an object */
  getDefinition(): TaskInfo;

  /** Whether this task requires sudo/root privileges */
  getRequiresSudo(): boolean;

  /** Check if the tool is installed and get version info */
  checkVersion(desiredVersion?: string): Promise<VersionCheckResult>;

  /** Get the command to check the installed version */
  getVersionCommand(): string | undefined;

  /** Parse version output from the command */
  parseVersion(output: string): string | undefined;
}

/**
 * Task definition returned by getDefinition()
 */
export interface TaskInfo {
  id: string;
  name: string;
  description?: string;
  homepage?: string;
  tags: string[];
  dependencies: string[];
  steps: InstallStep[];
  /** Whether this task requires sudo/root privileges to install */
  requireSudo?: boolean;
}

/**
 * Base class for all task definitions
 * Can be initialized with a JSON config or by setting protected properties
 */
export class BaseTask implements ITask {
  protected id: string;
  protected name: string;
  protected description?: string;
  protected homepage?: string;
  protected tags: string[];
  protected dependencies: string[];
  protected versionCommand?: string;
  protected versionParseRegex?: string;
  protected requireSudo?: boolean;
  protected steps: InstallStep[];

  /**
   * Create a task from config (JSON) or with default empty values
   */
  constructor(config?: TaskConfig) {
    if (config) {
      this.id = config.id;
      this.name = config.name;
      this.description = config.description;
      this.homepage = config.homepage;
      this.tags = config.tags || [];
      this.dependencies = config.dependencies || [];
      this.versionCommand = config.versionCommand;
      this.versionParseRegex = config.versionParseRegex;
      this.requireSudo = config.requireSudo;
      this.steps = config.steps;
    } else {
      // Default values for subclasses that set properties directly
      this.id = '';
      this.name = '';
      this.tags = [];
      this.dependencies = [];
      this.steps = [];
    }
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  getHomepage(): string | undefined {
    return this.homepage;
  }

  getTags(): string[] {
    return this.tags;
  }

  getDependencies(): string[] {
    return this.dependencies;
  }

  getSteps(): InstallStep[] {
    return this.steps;
  }

  getRequiresSudo(): boolean {
    return this.requireSudo ?? false;
  }

  /**
   * Get the complete task definition as an object
   */
  getDefinition(): TaskInfo {
    return {
      id: this.getId(),
      name: this.getName(),
      description: this.getDescription(),
      homepage: this.getHomepage(),
      tags: this.getTags(),
      dependencies: this.getDependencies(),
      steps: this.getSteps(),
      requireSudo: this.requireSudo,
    };
  }

  /**
   * Get the command to check the installed version
   */
  getVersionCommand(): string | undefined {
    return this.versionCommand;
  }

  /**
   * Parse version string from command output using the configured regex
   */
  parseVersion(output: string): string | undefined {
    if (this.versionParseRegex) {
      const match = output.match(new RegExp(this.versionParseRegex));
      return match ? match[1] : undefined;
    }
    // Default: extract first version-like pattern (e.g., "1.2.3", "v1.2.3")
    const match = output.match(/v?(\d+\.\d+(?:\.\d+)?(?:[-+][a-zA-Z0-9.]+)?)/);
    return match ? match[1] : undefined;
  }

  /**
   * Check if the tool is installed and compare versions
   */
  async checkVersion(desiredVersion: string = 'latest'): Promise<VersionCheckResult> {
    const versionCmd = this.getVersionCommand();

    // If no version command, we can't check - assume not installed
    if (!versionCmd) {
      return {
        installed: false,
        needsUpdate: true,
        message: `Version check not supported for ${this.name}`,
      };
    }

    try {
      const output = execSync(versionCmd, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000,
      }).trim();

      const currentVersion = this.parseVersion(output);

      if (!currentVersion) {
        return {
          installed: true,
          needsUpdate: false,
          message: `${this.name} is installed (version unknown)`,
        };
      }

      // Check if current version satisfies the desired version constraint
      const satisfies = this.satisfiesVersion(currentVersion, desiredVersion);

      return {
        installed: true,
        currentVersion,
        needsUpdate: !satisfies,
        message: satisfies
          ? `${this.name} ${currentVersion} satisfies ${desiredVersion}`
          : `${this.name} ${currentVersion} does not satisfy ${desiredVersion}`,
      };
    } catch {
      // Command failed - tool is not installed
      return {
        installed: false,
        needsUpdate: true,
        message: `${this.name} is not installed`,
      };
    }
  }

  /**
   * Check if a version satisfies a version constraint (semver-style)
   * Supports: *, x, latest, 1.x, 1.2.x, ^1.2.3, ~1.2.3, >=1.2.3, >1.2.3, <=1.2.3, <1.2.3, 1.2.3
   */
  protected satisfiesVersion(version: string, constraint: string): boolean {
    const v = this.parseVersionParts(version);
    if (!v) return false;

    const c = constraint.trim();

    // Handle "latest", "*", or "x" - any version satisfies
    if (c === 'latest' || c === '*' || c === 'x' || c === '') {
      return true;
    }

    // Handle caret (^) - compatible with version (same major, >= minor.patch)
    if (c.startsWith('^')) {
      const target = this.parseVersionParts(c.slice(1));
      if (!target) return false;
      // Major must match, and version must be >= target
      if (v.major !== target.major) return false;
      return this.compareVersions(version, c.slice(1)) >= 0;
    }

    // Handle tilde (~) - approximately equivalent (same major.minor, >= patch)
    if (c.startsWith('~')) {
      const target = this.parseVersionParts(c.slice(1));
      if (!target) return false;
      // Major and minor must match, and version must be >= target
      if (v.major !== target.major || v.minor !== target.minor) return false;
      return v.patch >= target.patch;
    }

    // Handle >= operator
    if (c.startsWith('>=')) {
      return this.compareVersions(version, c.slice(2).trim()) >= 0;
    }

    // Handle > operator
    if (c.startsWith('>') && !c.startsWith('>=')) {
      return this.compareVersions(version, c.slice(1).trim()) > 0;
    }

    // Handle <= operator
    if (c.startsWith('<=')) {
      return this.compareVersions(version, c.slice(2).trim()) <= 0;
    }

    // Handle < operator
    if (c.startsWith('<') && !c.startsWith('<=')) {
      return this.compareVersions(version, c.slice(1).trim()) < 0;
    }

    // Handle = operator (explicit equality)
    if (c.startsWith('=')) {
      return this.compareVersions(version, c.slice(1).trim()) === 0;
    }

    // Handle wildcards like 1.x, 1.2.x, 1.*, 1.2.*
    if (c.includes('x') || c.includes('*')) {
      const parts = c.replace(/^v/, '').split('.');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'x' || parts[i] === '*') {
          // Wildcard - any value matches from here
          return true;
        }
        const vParts = [v.major, v.minor, v.patch];
        const cPart = parseInt(parts[i], 10);
        if (isNaN(cPart)) continue;
        if (vParts[i] !== cPart) return false;
      }
      return true;
    }

    // Handle range like "1.2.3 - 2.3.4"
    if (c.includes(' - ')) {
      const [min, max] = c.split(' - ').map(s => s.trim());
      return this.compareVersions(version, min) >= 0 && this.compareVersions(version, max) <= 0;
    }

    // Handle OR conditions (||)
    if (c.includes('||')) {
      return c.split('||').some(part => this.satisfiesVersion(version, part.trim()));
    }

    // Handle AND conditions (space-separated)
    if (c.includes(' ') && !c.includes(' - ')) {
      return c.split(/\s+/).every(part => this.satisfiesVersion(version, part.trim()));
    }

    // Exact version match
    return this.compareVersions(version, c) === 0;
  }

  /**
   * Parse version string into parts
   */
  protected parseVersionParts(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.replace(/^v/, '').match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10) || 0,
      minor: parseInt(match[2], 10) || 0,
      patch: parseInt(match[3], 10) || 0,
    };
  }

  /**
   * Compare two version strings
   * Returns: -1 if a < b, 0 if a == b, 1 if a > b
   */
  protected compareVersions(a: string, b: string): number {
    const partsA = a.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    const partsB = b.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);

    const maxLen = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLen; i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;

      if (numA < numB) return -1;
      if (numA > numB) return 1;
    }

    return 0;
  }
}
