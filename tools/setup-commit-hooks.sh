#!/bin/bash
# Install and configure pre-commit hooks for this repository

set -e

# Change to the root of the repository
cd "$(dirname "$0")/.."

echo "Setting up commit hooks..."

# If core.hooksPath is set (e.g. by husky), unset it so pre-commit can take over
if git config --local --get core.hooksPath &> /dev/null; then
    echo "Clearing local core.hooksPath config..."
    git config --local --unset core.hooksPath
fi

if command -v uvx &> /dev/null; then
    echo "Found 'uvx'. Installing git hooks using uvx pre-commit..."
    uvx pre-commit install
elif command -v pre-commit &> /dev/null; then
    echo "Found 'pre-commit' globally. Installing git hooks..."
    pre-commit install
else
    echo "Neither 'uvx' nor 'pre-commit' command was found."
    echo "Please install pre-commit (e.g. using 'pip install pre-commit' or 'brew install pre-commit') and run:"
    echo "  pre-commit install"
    exit 1
fi

echo "Git commit hooks configured successfully!"
