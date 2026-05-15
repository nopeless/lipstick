declare module 'node:test' {
  const test: {
    (name: string, fn: () => unknown | Promise<unknown>): void
    only: (name: string, fn: () => unknown | Promise<unknown>) => void
    skip: (name: string, fn: () => unknown | Promise<unknown>) => void
  }

  export default test
}

declare module 'node:assert/strict' {
  const assert: any
  export default assert
}
