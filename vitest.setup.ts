import "@testing-library/jest-dom/vitest";
import React from "react";

// Provide a React global for components rendered by Vitest without the automatic JSX runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).React = React;
