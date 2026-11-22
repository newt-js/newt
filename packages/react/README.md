# @newt-js/react

`@newt-js/client` in a React frontend, and the components its apps are made of.

- `useValue` reads a signal in render and repaints the component when, and only when, it changes.
- `Provide` gives the components below it their own instances of some services, alive as long as it is;
  `useService(Service)` hands a component the one from the closest `Provide` above, or the app's.
- `Router` goes around the app once, with `basename` where the backend serves it (`/backoffice`): routes come from
  `react-router` (`Routes`, `Route`, `Outlet`, `useParams`), and every link of the components goes through it.
  `useQueryParam('status')` reads one query param and changes it: what a person chose to look at (a tab, a
  filter, a page, a search) lives in the address, so it can be shared, kept and gone back to. An app depends on
  `react-router` itself.
- shadcn's components, in `src/shadcn/` as shadcn writes them: never edit them. They are its own: the package does
  not export them, and newt's lint refuses them in an app.
- Its components wrap them, in `src/components/`: props in newt's words, and no `className` nor `style`, so an app
  cannot restyle them. Each one's doc comment says when to use it, and when another fits better. Every link of them
  goes through the app's router (`LinkProvider`, which `Router` sets).
  - **Forms**: `Field` (a control's label, help and error), `Input`, `Textarea`, `Select` (few options),
    `Combobox` (many, searched), `RadioGroup`, `Checkbox`, `Switch`, `Slider`, `DatePicker`, `InputOTP`, `Toggle`,
    `ToggleGroup`; `Form` around them. A control inside a `Field` is tied to its label and error by itself.
  - **Data**: `Table`, `Card`, `Item`, `Badge`, `Avatar`, `Alert`, `Empty`, `Skeleton`, `Spinner`, `Progress`,
    `Separator`, `Kbd`, `AspectRatio`, `Chart` (bars, lines or areas, in the theme's colors).
  - **Layers**: `Dialog`, `ConfirmDialog`, `Sheet`, `Drawer`, `Popover`, `HoverCard`, `Tooltip`, `Menu`,
    `ContextMenu`, `Menubar`, `CommandPalette`; `toast` and its `Toaster`.
  - **Navigation**: `Tabs` and `Pagination`, which keep the open tab and the page in the address; `Breadcrumb`,
    `NavigationMenu` (a public site's top), `SidebarLayout` (an app's frame, in its shell).
  - **Content**: `Accordion`, `Collapsible`, `Carousel`, `Resizable`, `ButtonGroup`, `Button`, `Marker`,
    `ChatThread` and `ChatMessage`, `Attachment`.
- `FormStore` and `ListStore` (from `@newt-js/client`) in a screen: `useFormField(form, 'name')` gives a control its
  value and its error (`<Field label="Name" error={name.error}><Input {...name.control} /></Field>`), `Form` shows
  what is wrong with the whole form, and `LoadMore` asks a list for its next page.
- `Guard` keeps the routes inside it for those a signal allows (`true`), sends the rest to `otherwise` with
  `?next=`, and shows nothing while it is not known (`null`).
- The layout, with no class names: `Column` (one under another) and `Row` (side by side) take a `gap`, `align`,
  `justify` and `padding` from the spacing scale, `grow` to take the room left, `fill` to be as tall as their parent,
  a `width` (`xs` to `xl`, or `full`) and `as` for what they are to the page (`nav`, `aside`, `ul`…). `Grid` lays out
  columns per breakpoint (`columns={{ base: 1, md: 3 }}`), `Container` centers and caps the width, `Spacer` pushes what
  follows it to the end, `Scroll` scrolls its content inside the room left and `Sticky` keeps a header or a bar of
  actions on its edge while the rest scrolls. A side column and a page that scrolls on its own:

  ```tsx
  <Row fill align="stretch" gap={0}>
    <Column as="nav" width="sm" padding={4}>…</Column>
    <Scroll>
      <Sticky><Row padding={4}><Heading>Clients</Heading><Spacer /><Button>New</Button></Row></Sticky>
      <Column padding={4}>…</Column>
    </Scroll>
  </Row>
  ```

  Every page is made of these: an app never needs a class name to lay something out.
- Text: `Heading` (`level` 1 to 4) and `Text` (`tone`, `size`, `strong`, `as`). An app writes no `h1` nor `p` of its own.
- The theme, `@newt-js/react/theme.css`: an app's stylesheet imports it and Tailwind builds it.

```css
/* an app's stylesheet */
@import "@newt-js/react/theme.css";
@source "./";
```

## An app never styles

Outside its own `components/`, a context's app writes no `className`, `class` nor `style`, no `<style>`, and
imports neither the tools that make class names (`cn`, `class-variance-authority`, `tailwind-merge`, `clsx`), nor
Radix, nor shadcn's pieces (`newt/app-styles`). It writes no element of the browser's own either, no `div`, `h1` nor
`p`: it composes these components (`newt/app-html`). So every app looks the same.

## An app's own components

An app is made of these components, composed. When nothing here fits, look again: most needs are a
composition. Only when a piece makes full sense for the app alone, it gets a component of its own, in its
`components/` folder (`src/contexts/<context>/app/components/`): it wraps or composes these, takes props in the
app's words, and is the one place of the app with some room for its own look. Its doc comment says, on a line
`Why: …`, why nothing here composes it (`newt/app-components`). The app's structures (a list page, a detail page)
live in `components/layouts/`, made of `Column`, `Row`, `Scroll` and `Sticky`, with as little of their own look as can be.
