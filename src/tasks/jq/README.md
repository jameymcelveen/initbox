# jq

**Lightweight command-line JSON processor**

## Overview

jq is a lightweight and flexible command-line JSON processor. It's like `sed` for JSON data - you can use it to slice, filter, map, and transform structured data with ease. jq is written in portable C and has zero runtime dependencies.

## Key Features

- **Filtering**: Extract specific fields from JSON
- **Transformation**: Map and modify JSON structures
- **Formatting**: Pretty-print or compact JSON output
- **Slicing**: Work with arrays and nested objects
- **Conditionals**: Filter based on conditions

## Links

- **Website**: https://stedolan.github.io/jq/
- **Documentation**: https://stedolan.github.io/jq/manual/
- **GitHub**: https://github.com/stedolan/jq

## Installation

This task installs jq via:
- **macOS**: Homebrew (`brew install jq`)
- **Linux**: APT (`apt install jq`)

## Version Check

```bash
jq --version
```

## Example Usage

```bash
# Pretty print JSON
echo '{"name":"John","age":30}' | jq '.'

# Extract a field
echo '{"name":"John","age":30}' | jq '.name'

# Filter array
echo '[1,2,3,4,5]' | jq '.[] | select(. > 2)'
```

