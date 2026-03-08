# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess Opening Trainer is a forever free chess opening trainer built to learn the most important chess openings based on a combination of memorizing and strategic understanding. It is a Next.js + TypeScript application with MobX for state management.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run tests
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Run E2E tests
npx playwright test            # Run all E2E tests
npx playwright test --ui       # Run E2E tests with UI mode

# Preview production build
npm run preview
```

## Architecture

- **State Management**: MobX with mobx-react-lite for React integration
- **Presentation Model Pattern**: Keep UI components free from any logic, all logic resides in models
- **Avoid Hooks**: React State Hooks will spoil our architecture. Use mobx observables and observers
  where UI state has to be synchronized. Use other hooks only if absolutely needed.
- **Strict Types**: Use typescript strict mode and ensure you don't use untyped arguments or return parameters.
- **Explicit Types**: Avoid inline type declarations. If they are used in more than one place define a type and use this.

## Process

- **TDD Methodology**: Use proper test driven development approach:
  1. First write tests that fail
  2. Then create empty functions/classes with correct signatures
  3. Run tests to verify they compile but fail as expected
  4. Implement the functionality to make tests pass
  5. Refactor if needed while keeping tests green
- **Step by Step**: Work step by step. For complex tasks make a precise plan using deep thinking
  and write it into a plan.md file. If a step is finished, ensure all tests are running and the system builds.
  Then ask me to verify the result and after confirmation update the plan and commit the step.
- **Plan Management**: Update plan.md with beautiful green checkmarks (✅) for completed tasks
- **Commit Process**:
  - Always run tests and linting before committing
  - Update plan.md with progress before committing
  - Use descriptive commit messages
  - Amend commits when requested to update plan status
- **Framework**: Next.js with React
- **Testing**: Vitest with jsdom environment, tests located in `__tests__` directories
- **Code Quality**: ESLint with TypeScript support, Prettier for formatting
- **Pre-commit**: Husky + lint-staged runs ESLint and Prettier on staged files

## Test Configuration

### Unit Tests
- Test files: `**/__tests__/**/*.spec.ts` and `**/__tests__/**/*.spec.tsx`
- Environment: jsdom with global test utilities

### E2E Tests (Playwright)
- E2E test files: `e2e/**/*.spec.ts`
- **Page Object Pattern**: Always encapsulate selectors and page interactions in page object classes
  located in `e2e/pages/`. Tests should never use raw selectors directly — always go through page objects.
- **`data-testid` Attributes**: Always add `data-testid` attributes to components for use in E2E tests.
  This decouples tests from CSS classes, element structure, and styling changes, making tests robust
  against UI refactoring. Example: `<button data-testid="start-training">` selected via
  `page.getByTestId('start-training')`.
- **Naming Convention**: Use kebab-case for `data-testid` values (e.g., `data-testid="opening-list-item"`).
- **Page Object Example**:
  ```typescript
  // e2e/pages/training.page.ts
  export class TrainingPage {
    constructor(private page: Page) {}
    get startButton() { return this.page.getByTestId('start-training'); }
    async start() { await this.startButton.click(); }
  }
  ```

## Code Quality Guidelines

- TypeScript files: ESLint fix + Prettier
- Other files (json, md, css, html): Prettier only
