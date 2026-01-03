# fzf

**Command-line fuzzy finder**

## Overview

fzf is a general-purpose command-line fuzzy finder. It's an interactive filter for any kind of list: files, command history, processes, hostnames, bookmarks, git commits, etc. fzf is extremely fast and portable with no external dependencies.

## Key Features

- **Fuzzy Search**: Fast approximate string matching
- **Keyboard Navigation**: Vim-style key bindings
- **Preview Window**: View file contents while browsing
- **Shell Integration**: History search, file completion
- **Scriptable**: Easy to integrate with scripts

## Links

- **Website**: https://github.com/junegunn/fzf
- **Documentation**: https://github.com/junegunn/fzf#readme
- **Wiki**: https://github.com/junegunn/fzf/wiki

## Installation

This task installs fzf via:
- **macOS**: Homebrew (`brew install fzf`)
- **Linux**: APT (`apt install fzf`)

## Version Check

```bash
fzf --version
```

## Example Usage

```bash
# Find files
find . | fzf

# Search command history (Ctrl+R)
# File completion (Ctrl+T)
# Change directory (Alt+C)
```

