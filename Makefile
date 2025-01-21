# Variables
PYTHON = python3.10
POETRY = poetry
RUFF = ruff

# Colors for terminal output
GREEN = \033[0;32m
BLUE = \033[0;34m
NC = \033[0m  # No Color

.DEFAULT_GOAL := help

help:
	@echo "Available commands:"
	@echo "${GREEN}make setup${NC}          Install project dependencies and pre-commit hooks"
	@echo "${GREEN}make lock${NC}           Lock the Poetry.lock with packages defined in pyproject.toml"
	@echo "${GREEN}make install${NC}        Install project dependencies with Poetry"
	@echo "${GREEN}make install-main${NC}   Install project dependencies with Poetry (only main)"
	@echo "${GREEN}make update${NC}         Update dependencies to latest versions"
	@echo "${GREEN}make export-requirements${NC}  Export requirements.txt"
	@echo "${GREEN}make test${NC}           Run tests with pytest"
	@echo "${GREEN}make watch-test${NC}     Run tests in watch mode"
	@echo "${GREEN}make coverage${NC}       Run tests with coverage report"
	@echo "${GREEN}make lint${NC}           Run ruff linting"
	@echo "${GREEN}make format${NC}         Format code with ruff"
	@echo "${GREEN}make check${NC}          Run all checks (format, lint, test)"
	@echo "${GREEN}make clean${NC}          Remove build/temp files"

setup:
	$(POETRY) install
	$(POETRY) run pre-commit install

lock:
	$(POETRY) lock

install:
	$(POETRY) install

install-main:
	$(POETRY) install --only main

update:
	$(POETRY) update

export-requirements:
	$(POETRY) export --without-hashes --format=requirements.txt > requirements.txt

test:
	$(POETRY) run pytest tests/

watch-test:
	$(POETRY) run ptw tests/ --nobeep

coverage:
	$(POETRY) run coverage run -m pytest tests/
	$(POETRY) run coverage report
	$(POETRY) run coverage html

lint:
	$(POETRY) run $(RUFF) check .

format:
	$(POETRY) run $(RUFF) format .

check: format lint test

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name ".coverage" -exec rm -rf {} +
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type f -name "coverage.xml" -delete

.PHONY: help install update test watch-test coverage lint format check clean
