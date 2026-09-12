# Contributing to CuBlocky

Thank you for your interest in contributing!

## Development Setup

1. Clone the repository
2. Install Node.js 18+ and .NET 9 SDK
3. `cd web && npm install`
4. `cd ../server && dotnet restore`
5. Run `../Launch.ps1` or manually start both frontend and backend

## Pull Requests

- Fork the repo and create a feature branch from `master`
- Keep commits focused and descriptive
- Test your changes before submitting
- Follow existing code style

## Issues

- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce for bugs
- Check existing issues before creating new ones

## Code Style

- TypeScript/React for frontend (`web/src/`)
- C# for backend (`server/`)
- No comments in generated C# code
- Use `I18n.T(zh, en)` for user-facing strings

## License

By contributing, you agree that your contributions will be licensed under MIT.
