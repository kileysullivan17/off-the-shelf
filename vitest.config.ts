import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // only this app's tests — the sibling planner/ project has its own suite
    include: ['src/**/*.test.ts'],
  },
})
