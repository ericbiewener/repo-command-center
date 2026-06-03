# Coding Guidelines

- Use TypeScript
- Use automatically returning arrow functions when possible.
- Do NOT add function type annotations when TypeScript can correctly infer the return type.
- Use ternaries whenever possible, including nested ternaries.
- Use node's `assert` rather than manually throwing errors.
- Use basic JS objects rather than `Map`s unless there is a need for `Map`-specific functionality.

# Status File Schema Changes

- When application changes are made that expect a different schema from the `status.json` files:
  - Do NOT add backwards compatible code to handle the previous schema shape
  - Do NOT add schema versioning.
  - REWRITE the `status.json` files to comply with the new schema.
