# NVM (Node Version Manager)

**Manage multiple Node.js versions**

## Overview

NVM (Node Version Manager) is a bash script to manage multiple active Node.js versions. It allows you to install, switch between, and manage different versions of Node.js on a single machine, which is essential for working on multiple projects with different Node.js requirements.

## Key Features

- **Multiple Versions**: Install and switch between any Node.js version
- **Per-Project Versions**: Use `.nvmrc` files to specify project versions
- **Easy Installation**: Simple curl-based installation
- **Shell Integration**: Automatic version switching in terminals
- **No sudo Required**: Installs in your home directory

## Links

- **Website**: https://github.com/nvm-sh/nvm
- **Documentation**: https://github.com/nvm-sh/nvm#readme
- **GitHub**: https://github.com/nvm-sh/nvm

## Installation

This task installs NVM via the official installation script.

## Dependencies

- `curl` - Required to download the installation script

## Version Check

```bash
nvm --version
```

## Example Usage

```bash
# Install latest LTS
nvm install --lts

# Install specific version
nvm install 18.17.0

# Switch versions
nvm use 20

# Set default version
nvm alias default 20
```

