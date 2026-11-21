# @newt-js/react

`@newt-js/client` in a React frontend, and the components its apps are made of.

- `useValue` reads a signal in render and repaints the component when, and only when, it changes.
- shadcn's components, in `src/shadcn/` as shadcn writes them: never edit them. Import each by its file,
  `import { Button } from '@newt-js/react/button'`.
- The theme, `@newt-js/react/theme.css`: an app's stylesheet imports it and Tailwind builds it.

```css
/* an app's stylesheet */
@import "@newt-js/react/theme.css";
@source "./";
```
