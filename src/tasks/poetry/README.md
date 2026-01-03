# Poetry

**Python packaging and dependency management**

## Overview

Poetry is a tool for dependency management and packaging in Python. It allows you to declare the libraries your project depends on and manages them for you. Poetry uses a lock file to ensure deterministic installations and provides a modern approach to Python project management.

## Key Features

- **Dependency Resolution**: Intelligent dependency resolver
- **Lock Files**: Deterministic installations with poetry.lock
- **Virtual Environments**: Automatic virtual environment management
- **Build & Publish**: Build and publish packages to PyPI
- **pyproject.toml**: Modern Python project configuration

## Links

- **Website**: https://python-poetry.org
- **Documentation**: https://python-poetry.org/docs/
- **GitHub**: https://github.com/python-poetry/poetry

## Installation

This task installs Poetry via the official installation script:
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

## Dependencies

- `python` - Python 3 must be installed first
- `curl` - Required to download the installation script

## Version Check

```bash
poetry --version
```

