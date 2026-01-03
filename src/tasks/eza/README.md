# eza

**Modern replacement for ls**

## Overview

eza is a modern replacement for the venerable command-line tool `ls`. It's faster, more colorful, and provides more useful information by default. eza uses colors to distinguish file types and metadata, and it knows about symlinks, extended attributes, and Git.

## Key Features

- **Colors**: Rich color output for file types
- **Git Integration**: Shows Git status of files
- **Tree View**: Built-in tree display
- **Icons**: Optional file icons
- **Extended Attributes**: Display file metadata

## Links

- **Website**: https://github.com/eza-community/eza
- **Documentation**: https://github.com/eza-community/eza#readme
- **Installation**: https://github.com/eza-community/eza#installation

## Installation

This task installs eza via:
- **macOS**: Homebrew (`brew install eza`)
- **Linux**: Cargo (`cargo install eza`)

## Version Check

```bash
eza --version
```

## Example Usage

```bash
# List files with icons
eza --icons

# Long format with Git status
eza -l --git

# Tree view
eza --tree

# Show all files including hidden
eza -a
```

