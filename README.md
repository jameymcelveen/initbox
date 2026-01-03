# 🚀 initbox

A CLI tool to install apps and tools based on YAML formulas downloaded from the web.

[![npm version](https://img.shields.io/npm/v/initbox.svg)](https://www.npmjs.com/package/initbox)
[![npm downloads](https://img.shields.io/npm/dm/initbox.svg)](https://www.npmjs.com/package/initbox)
[![Release](https://github.com/jameymcelveen/initbox/actions/workflows/release.yml/badge.svg)](https://github.com/jameymcelveen/initbox/actions/workflows/release.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

## Features

- 📦 **Formula-based installation** - Define your dev environment in YAML
- 🌐 **Remote formulas** - Host your formulas anywhere (GitHub, GitLab, S3, etc.)
- 🧙 **Interactive wizard** - Inquirer-powered interactive setup
- 🎨 **Beautiful CLI** - Chalk-powered colorful output
- 📁 **Category selection** - Install by category or individual tasks
- 🔗 **Dependencies** - Automatic dependency resolution
- 🖥️ **Cross-platform** - Support for macOS, Linux (brew, apt, npm, pip, etc.)
- 🧪 **Dry run mode** - Preview what will be installed
- 📂 **TypeScript tasks** - 22 pre-built task classes with full type safety

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/initbox.git
cd initbox

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

## Usage

### Interactive Mode (Default)

Run the interactive wizard to select what to install:

```bash
initbox
# or
initbox interactive
```

### Direct Install

Install from a formula URL directly:

```bash
# Install everything
initbox install https://example.com/my-formula.yaml

# Install specific tasks
initbox install https://example.com/my-formula.yaml -t git node-lts docker

# Install by category
initbox install https://example.com/my-formula.yaml -c "JavaScript/Node" "DevOps"

# Dry run
initbox install https://example.com/my-formula.yaml --dry-run
```

### Inspect Formula

View formula contents without installing:

```bash
initbox inspect https://example.com/my-formula.yaml
```

### Validate Formula

Validate a formula YAML file:

```bash
initbox validate https://example.com/my-formula.yaml
```

## Formula Structure

Formulas reference tasks by ID. By default, tasks are loaded from the bundled TypeScript task library.

### Formula File (formula.yaml)

Each task entry only needs `id`, `category`, and optionally `version`:

```yaml
name: My Dev Setup
version: "1.0.0"
description: My development environment
author: Your Name

# tasksUrl: builtin (default - uses bundled tasks)
# tasksUrl: https://example.com/tasks (for custom remote tasks)

# Optional: require sudo privileges to execute
# require-sudo: true

categories:
  - Core Tools
  - JavaScript
  - Python

tasks:
  - id: git
    category: Core Tools
    version: "^2.40.0"

  - id: node-lts
    category: JavaScript
    version: "~20.0.0"

  - id: python
    category: Python
    version: "3.x"
```

### Version Patterns

Dev-setup supports semver-style version patterns similar to `package.json`. When a task is executed, it checks the currently installed version against the requested version and only installs/updates if necessary.

| Pattern | Description | Example | Matches |
|---------|-------------|---------|---------|
| `latest` | Always satisfied, no update needed | `latest` | Any version |
| `1.2.3` | Exact version match | `1.2.3` | Only `1.2.3` |
| `1.2.x` | Any patch version | `1.2.x` | `1.2.0`, `1.2.5`, `1.2.99` |
| `1.x` or `1.x.x` | Any minor/patch version | `1.x` | `1.0.0`, `1.5.3`, `1.99.99` |
| `*` | Any version (wildcard) | `*` | Any version |
| `^1.2.3` | Compatible with version (same major) | `^1.2.3` | `>=1.2.3` and `<2.0.0` |
| `~1.2.3` | Approximately equivalent (same minor) | `~1.2.3` | `>=1.2.3` and `<1.3.0` |

**Examples:**

```yaml
tasks:
  # Install any 2.x version of git
  - id: git
    category: Core
    version: "2.x"

  # Install node 20.x but at least 20.10.0
  - id: node-lts
    category: JavaScript
    version: "^20.10.0"

  # Install exactly Python 3.11.4
  - id: python
    category: Python
    version: "3.11.4"

  # Always install/update to latest
  - id: docker
    category: DevOps
    version: "latest"
```

### Sudo Requirements

Some formulas may require root/sudo privileges to execute (e.g., for system-level installations or modifying protected directories). You can mark a formula as requiring sudo with the `require-sudo` flag:

```yaml
name: System Setup
version: "1.0.0"
require-sudo: true

tasks:
  - id: docker
    category: DevOps
```

When a formula with `require-sudo: true` is executed:

1. **CLI check**: The installer verifies if running with sudo/root privileges
2. **Clear error**: If not running as sudo, a clear message is shown with the correct command
3. **Dry run bypass**: Dry runs (`--dry-run`) skip the sudo check for safe inspection

```bash
# Running without sudo shows an error:
$ initbox install https://example.com/system-formula.yaml
❌ This formula requires sudo privileges to execute.
   Please run the command with sudo:

   sudo initbox install https://example.com/system-formula.yaml

# Run with sudo:
$ sudo initbox install https://example.com/system-formula.yaml
```

### Bundled Tasks

The following tasks are bundled with initbox and available to any formula:

| Category | Tasks |
|----------|-------|
| **Core Tools** | git, gh, curl, jq |
| **JavaScript/Node** | nvm, node-lts, pnpm, bun |
| **Python** | python, poetry |
| **Databases** | postgresql, redis |
| **DevOps** | docker, kubectl, terraform |
| **Productivity** | fzf, ripgrep, bat, eza, lazygit |
| **Testing** | hello |

### Task Definition Format

Each bundled task is defined as a YAML configuration file in `src/tasks/{id}/task.yaml`:

```yaml
# src/tasks/git/task.yaml
id: git
name: Git
description: Distributed version control system
homepage: https://git-scm.com
tags:
  - essential
  - vcs
dependencies: []
versionCommand: git --version
versionParseRegex: "git version (\\d+\\.\\d+\\.\\d+)"
steps:
  - name: Install Git
    type: brew
    command: git
    platforms:
      - darwin
  - name: Install Git (Linux)
    type: apt
    command: git
    platforms:
      - linux
```

Tasks are loaded and registered in `src/tasks/index.ts`:

```typescript
import Task from './task.js';
import gitYaml from './git/task.yaml?raw';

export const taskRegistry: Record<string, ITask> = {
  git: Task.fromYaml(gitYaml),
  // ... other tasks
};
```

### Task Interface

All tasks implement the `ITask` interface:

```typescript
interface ITask {
  getId(): string;
  getName(): string;
  getDescription(): string | undefined;
  getHomepage(): string | undefined;
  getTags(): string[];
  getDependencies(): string[];
  getSteps(): InstallStep[];
  getDefinition(): TaskInfo;
  getVersionCommand(): string | undefined;
  parseVersion(output: string): string | undefined;
  checkVersion(desiredVersion?: string): Promise<VersionCheckResult>;
}

interface VersionCheckResult {
  installed: boolean;
  currentVersion?: string;
  needsUpdate: boolean;
  message: string;
}
```

### Step Types

| Type | Description | Example |
|------|-------------|---------|
| `brew` | Homebrew package | `command: 'git'` |
| `npm` | npm global package | `command: 'typescript'` |
| `pip` | pip package | `command: 'flask'` |
| `apt` | apt-get package | `command: 'build-essential'` |
| `shell` | Shell command | `command: 'echo "Hello"'` |
| `curl` | Download and execute | `command: 'https://example.com/install.sh'` |
| `git` | Git clone | `command: 'https://github.com/user/repo.git'` |

### Step Options

```typescript
{
  name: 'Install Package',
  type: 'brew',
  command: 'package-name',
  args: ['--cask'],              // Additional arguments
  optional: true,                 // Don't fail if this step fails
  platforms: ['darwin', 'linux'], // Only run on specific platforms
  env: { MY_VAR: 'value' },       // Environment variables
  cwd: '/some/path',              // Working directory
  postInstall: ['echo "Done!"'],  // Commands to run after
}
```

## Development

```bash
# Run in development mode
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build
```

## Project Structure

```
initbox/
├── src/
│   ├── cli.ts                  # CLI entry point
│   ├── types/
│   │   └── formula.ts          # Formula & Task type definitions
│   ├── parser/
│   │   └── formula-parser.ts   # YAML parsing & task resolution
│   ├── executor/
│   │   ├── step-executor.ts    # Executes individual steps
│   │   └── formula-executor.ts # Orchestrates installation
│   ├── interactive/
│   │   └── wizard.ts           # Inquirer-based wizard
│   └── tasks/                  # Bundled task definitions
│       ├── base.ts             # BaseTask class & ITask interface
│       ├── task.ts             # Generic Task class with fromYaml()
│       ├── index.ts            # Task registry
│       ├── git/
│       │   ├── task.yaml       # Git task configuration
│       │   └── README.md       # Git documentation
│       ├── node-lts/
│       │   ├── task.yaml       # Node.js task configuration
│       │   └── README.md       # Node.js documentation
│       └── ...                 # 21 tasks total
├── examples/
│   ├── dev-formula.yaml        # Example formula
│   └── minimal-formula.yaml
├── dist/                       # Built output
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Hosting Your Formula

You only need to host a simple YAML file that references bundled tasks:

```yaml
# my-team-setup.yaml
name: Team Setup
version: "1.0.0"

tasks:
  - id: git
    category: Core
  - id: node-lts
    category: Dev
  - id: docker
    category: DevOps
```

Host it anywhere:
- **GitHub**: `https://raw.githubusercontent.com/user/repo/main/formula.yaml`
- **Gist**: Use raw gist URLs
- **Any web server**: Just serve the YAML file

Usage:
```bash
initbox install https://raw.githubusercontent.com/user/repo/main/formula.yaml
```

## Contributing Tasks

To add a new bundled task:

1. Create a folder: `src/tasks/{task-id}/`
2. Create `task.yaml` with the task configuration:

```yaml
id: my-task
name: My Task
description: Description here
homepage: https://example.com
tags:
  - tag1
  - tag2
dependencies: []
versionCommand: my-task --version
versionParseRegex: "v?(\\d+\\.\\d+\\.\\d+)"
steps:
  - name: Install My Task
    type: brew
    command: my-package
    platforms:
      - darwin
  - name: Install My Task (Linux)
    type: apt
    command: my-package
    platforms:
      - linux
```

3. Create `README.md` with documentation about the tool
4. Register in `src/tasks/index.ts`:

```typescript
import myTaskYaml from './my-task/task.yaml?raw';

export const taskRegistry: Record<string, ITask> = {
  // ... existing tasks
  'my-task': Task.fromYaml(myTaskYaml),
};
```

5. Build and test: `npm run build && npm run preview`

## License

MIT
