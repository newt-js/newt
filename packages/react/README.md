# @newt-js/react

`@newt-js/client` in a React frontend, and the components its apps are made of.

- `useValue` reads a signal in render and repaints the component when, and only when, it changes.
- shadcn's components, in `src/shadcn/` as shadcn writes them: never edit them. Import each by its file,
  `import { Button } from '@newt-js/react/button'`.
- The layout: `Stack` (one under another, a column), `Inline` (side by side, a row), `Grid` (columns per
  breakpoint, `columns={{ base: 1, md: 3 }}`) and `Container` (centers and caps the width), with a `gap` from the
  spacing scale. `import { Stack } from '@newt-js/react'`.
- The theme, `@newt-js/react/theme.css`: an app's stylesheet imports it and Tailwind builds it.

```css
/* an app's stylesheet */
@import "@newt-js/react/theme.css";
@source "./";
```

## An app never styles

Outside its own `components/`, a context's app writes no `className`, `class` nor `style`, no `<style>`, and
imports neither the tools that make class names (`cn`, `class-variance-authority`, `tailwind-merge`, `clsx`) nor
Radix: newt's lint refuses them (`newt/app-styles`), so every app looks the same.

## An app's own components

An app is made of these components, composed. When nothing here fits, look again: most needs are a
composition. Only when a piece makes full sense for the app alone, it gets a component of its own, in its
`components/` folder (`src/contexts/<context>/app/components/`): it wraps or composes these, takes props in the
app's words, and is the one place of the app with some room for its own look.
