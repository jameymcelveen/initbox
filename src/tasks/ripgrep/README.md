# ripgrep (rg)

**Recursively search directories for a regex pattern**

## Overview

ripgrep is a line-oriented search tool that recursively searches the current directory for a regex pattern. It's similar to grep but is much faster and respects .gitignore files by default. ripgrep is written in Rust and is one of the fastest search tools available.

## Key Features

- **Blazing Fast**: Extremely fast search using parallelism
- **Smart Defaults**: Respects .gitignore automatically
- **Unicode Support**: Full Unicode support
- **Regex**: Full regular expression support
- **File Type Filtering**: Search specific file types

## Links

- **Website**: https://github.com/BurntSushi/ripgrep
- **Documentation**: https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md
- **User Guide**: https://blog.burntsushi.net/ripgrep/

## Installation

This task installs ripgrep via:
- **macOS**: Homebrew (`brew install ripgrep`)
- **Linux**: APT (`apt install ripgrep`)

## Version Check

```bash
rg --version
```

## Example Usage

```bash
# Search for pattern in current directory
rg "pattern"

# Search only in specific file types
rg --type py "def main"

# Case insensitive search
rg -i "pattern"
```

