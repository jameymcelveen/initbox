# Node.js LTS

**JavaScript runtime (latest LTS version)**

## Overview

Node.js is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser. This task installs the latest LTS (Long Term Support) version of Node.js via NVM, which is recommended for most users.

## Key Features

- **V8 Engine**: Built on Chrome's V8 JavaScript engine
- **NPM**: Comes with npm, the world's largest software registry
- **Event-Driven**: Non-blocking, event-driven architecture
- **Cross-Platform**: Runs on Windows, macOS, and Linux
- **LTS Support**: Long-term support versions receive security updates

## Links

- **Website**: https://nodejs.org
- **Documentation**: https://nodejs.org/docs/
- **GitHub**: https://github.com/nodejs/node

## Installation

This task installs Node.js LTS via NVM:
```bash
nvm install --lts && nvm use --lts
```

## Dependencies

- `nvm` - Node Version Manager must be installed first

## Version Check

```bash
node --version
```

