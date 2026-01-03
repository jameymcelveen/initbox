# Redis

**In-memory data structure store**

## Overview

Redis is an open source, in-memory data structure store used as a database, cache, message broker, and streaming engine. It provides data structures such as strings, hashes, lists, sets, sorted sets with range queries, bitmaps, and more.

## Key Features

- **In-Memory**: Extremely fast read/write operations
- **Data Structures**: Rich set of built-in data types
- **Persistence**: Optional disk persistence
- **Pub/Sub**: Built-in publish/subscribe messaging
- **Clustering**: Built-in horizontal scaling

## Links

- **Website**: https://redis.io
- **Documentation**: https://redis.io/docs/
- **GitHub**: https://github.com/redis/redis

## Installation

This task installs Redis via:
- **macOS**: Homebrew (`brew install redis`)
- **Linux**: APT (`apt install redis-server`)

On macOS, the service is automatically started.

## Version Check

```bash
redis-server --version
```

