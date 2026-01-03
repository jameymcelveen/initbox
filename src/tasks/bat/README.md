# bat

**Cat clone with syntax highlighting and Git integration**

## Overview

bat is a cat clone with syntax highlighting and Git integration. It provides beautiful syntax highlighting for a large number of programming and markup languages. bat also integrates with Git to show file modifications and can be used as a drop-in replacement for cat.

## Key Features

- **Syntax Highlighting**: Support for 100+ languages
- **Git Integration**: Shows modifications in the gutter
- **Line Numbers**: Automatic line numbering
- **Paging**: Automatic paging for long files
- **Themes**: Multiple color themes available

## Links

- **Website**: https://github.com/sharkdp/bat
- **Documentation**: https://github.com/sharkdp/bat#readme
- **Themes**: https://github.com/sharkdp/bat#adding-new-themes

## Installation

This task installs bat via:
- **macOS**: Homebrew (`brew install bat`)
- **Linux**: APT (`apt install bat`)

## Version Check

```bash
bat --version
```

## Example Usage

```bash
# View a file with syntax highlighting
bat file.py

# Show line numbers only
bat -n file.py

# Concatenate files
bat file1.txt file2.txt
```

