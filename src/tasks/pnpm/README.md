# pnpm

**Fast, disk space efficient package manager**

## Overview

pnpm is a fast, disk space efficient package manager for JavaScript. It creates a non-flat node_modules by default, so code has no access to arbitrary packages. It also features a content-addressable store that saves disk space by sharing dependencies across projects.

## Key Features

- **Fast**: Up to 2x faster than npm
- **Disk Efficient**: Shares dependencies across all projects
- **Strict**: Creates non-flat node_modules by default
- **Monorepo Support**: First-class support for monorepos
- **Offline Mode**: Works offline if packages are cached

## Links

- **Website**: https://pnpm.io
- **Documentation**: https://pnpm.io/motivation
- **GitHub**: https://github.com/pnpm/pnpm

## Installation

This task installs pnpm via corepack:
```bash
corepack enable && corepack prepare pnpm@latest --activate
```

## Dependencies

- `node-lts` - Node.js must be installed first

## Version Check

```bash
pnpm --version
```

