# PostgreSQL

**Powerful open source relational database**

## Overview

PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development. It has earned a strong reputation for reliability, feature robustness, and performance. PostgreSQL is the database of choice for many enterprise and web applications.

## Key Features

- **ACID Compliance**: Full transactional support
- **Extensibility**: Custom data types, operators, and functions
- **Advanced Features**: JSON support, full-text search, geospatial data
- **Replication**: Built-in streaming replication
- **Security**: Row-level security, SSL support

## Links

- **Website**: https://www.postgresql.org
- **Documentation**: https://www.postgresql.org/docs/
- **GitHub**: https://github.com/postgres/postgres

## Installation

This task installs PostgreSQL via:
- **macOS**: Homebrew (`brew install postgresql@16`)
- **Linux**: APT (`apt install postgresql`)

On macOS, the service is automatically started.

## Version Check

```bash
psql --version
```

