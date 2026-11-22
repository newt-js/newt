# Frontend

How a context's app (`src/contexts/<context>/app/`) is built: React, with `@newt-js/client` (what the app
thinks with) and `@newt-js/react` (what it is made of). newt's lint holds most of this: run it after every change.
What it cannot see is marked **(no lint)**: keep to it all the same.

## Folders

```
app/
  index.html          the page Bun serves; it links app.css and loads main.tsx
  app.css             imports @newt-js/react/theme.css
  main.tsx            mounts the app; sets Requester.baseUrl to the context's API (the one file
                      besides the api files that touches Requester)
  app.tsx             <Router basename={BASE}> around the routes; the providers, the session
  app.routes.tsx      the shell's route, and one lazy route per feature
  base.ts             where the backend serves the app, and its API
  components/         the app's own components: the only place with class names, each with its `Why:`
    layouts/          the app's structures: as few as possible, each argued (see Structure)
  services/<name>/    what belongs to the whole app: the session, the user and permissions, the theme
  guards/             route guards: the session's, and any other
  pages/              the frame and the errors alone: shell/, not-found/, the route's error
  features/<feature>/ one folder per part of the business: clients, sessions…
```

- Nothing else at the root.
- **Pages or features.** `pages/` holds no state: no `*.service.ts`, `*.state.ts` nor `*.api.ts`. Anything that
  shows the business is a feature, however simple; the home too (`features/home/`).
- **Shell.** `pages/shell/shell.tsx` is the route that wraps the rest: its frame (navigation, brand, user)
  around `<Outlet />`. A feature never imports it.

A feature:

```
features/clients/
  clients.tsx            the root: <Provide services={[ClientsService]}>
  clients.routes.tsx
  clients.service.ts     the state and what changes it
  clients.state.ts       the state's shape and its first value
  clients.api.ts         the requests, extending Requester
  clients-list.tsx       a part split out of clients.tsx
  clients-list-row/      a part that split again: then it gets a folder
    clients-list-row.tsx
    clients-list-row-menu.tsx
```

- **Names say where a file lives.** Every file and folder inside a piece's folder is named after that folder:
  `clients-list.tsx`, `clients-list-row/`. The root of a folder is the plain name (`Clients`).
- **A part that splits off sits beside its parent**, named after it. It gets a folder of its own only when it
  splits again.
- **No `components/` inside a feature.**
- **A feature imports no other feature (no lint).** What two features share goes up to `services/`, only if it is
  the whole app's. Otherwise each loads its own, and they hear each other through events (see State).

## Size

A piece that grows is split. The lint stops these:

| Piece | Limit |
|---|---|
| Component file | 100 lines |
| JSX | nested 4 deep |
| Component | 1 `useService`, 3 `useValue` |
| Service | 150 lines, 7 public methods, 3 `inject()` |

- **A component past its limit** gets a part split out, named after it.
- **A service past its limit** is split by part of the feature, each provided where its part is
  (`clients-detail/` gets a `ClientsDetailService`).
- **A component that reads many values** gets one `computed` from its service that holds what it shows.

## State

The state lives in services, never in components. A component paints what a service holds and calls its methods.

```ts
// clients.state.ts
export type ClientsState = { items: ClientDTO[], loading: boolean }
export const CLIENTS_STATE: ClientsState = { items: [], loading: false }

// clients.service.ts
export class ClientsService {
  private readonly api = inject(ClientsApi)
  private readonly store = new Store(CLIENTS_STATE)
  readonly items = this.store.select('items')

  async load() {
    this.store.patch({ loading: true })
    this.store.patch({ items: await this.api.list(), loading: false })
  }
}

// clients-list.tsx
export function ClientsList() {
  const clients = useService(ClientsService)
  const items = useValue(clients.items)
  useEffect(() => { void clients.load() }, [clients])
  return <Column>{items.map(client => <ClientsListRow key={client.id} client={client} />)}</Column>
}
```

- **A component reads a signal with `useValue`**, which repaints it when, and only when, the signal changes.
  `.value` read while it renders gives a value that never repaints it. `.value` belongs in a handler, an effect
  or a service.
- **A service is coupled to what its UI needs (no lint).** It holds what its screens show, shaped as they show it.
  The business rules are the backend's. A service holds state, calls its API and tells the others.
- **A service's constructor has no effects (no lint).** It loads in a method the component calls, and `load()`
  may be called twice: StrictMode does in development.
- **`select` only in the service's fields (no lint)**, never in render.
- **Where state lives (no lint):** take the first step that holds it:
  1. `useState`, when only that component needs it, such as a row that is open.
  2. The closest ancestor of those who need it.
  3. A service with `<Provide>` in the lowest component that holds everyone who shares it.
  4. The root, `services/`, only for the whole app's.
- **A service is provided where its part is.** `<Provide services={[ClientsService]}>` gives the components below
  their own instance, released (`dispose`) when it goes away. A service that nobody provides is the app's, one
  for all.
- **Between features, events (no lint).**
  - When a feature changes something another shows, it emits an event named as the backend's events:
    `inject(EventBus).emit('client.updated', { id })`.
  - Those who show clients listen with `on` (stopping in their `dispose`) and load again.
  - A payload is JSON: ids, and little else.
  - The server's events, in real time, reach the same listeners through `receive`, so a feature never cares
    where an event came from.
- **Requests go in `<feature>.api.ts`**, beside its service: a class extending `Requester`, its `path` and one
  method per request. Nothing else talks to the backend. A failed request is an `ApiError` (`status`, `message`,
  `code`).

## Routes

The router is `react-router`, set up once by `<Router basename={BASE}>` (from `@newt-js/react`) in `app.tsx`: every
route and link starts at the context's path, and every `Button href` and link of the components goes through it.

```tsx
// app.routes.tsx
const Clients = lazy(() => import('./features/clients/clients').then(({ Clients }) => ({ default: Clients })))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="clients/*" element={<Clients />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
```

- **Every feature is lazy**, `lazy()` in `app.routes.tsx`: nobody downloads what they do not open. The shell holds
  the `<Suspense>` around `<Outlet />`, with no loader: a page shows what it has as it comes.
- **A feature's own routes** go in its `<feature>.routes.tsx` (`clients/:clientId`, `clients/new`), rendered by its root.
- **The address says what is on the screen (no lint).** What a person chose to look at lives in the URL, never only
  in a component or a service, so it can be shared, kept as a bookmark, opened in another tab and gone back to:
  - **Which thing:** a path segment, `/clients/:clientId`.
  - **How it is looked at:** a query param. That covers a tab (`?tab=secrets`), a list's filters
    (`?status=active&role=admin`), its order (`?sort=name`), its page (`?page=2`) and a search (`?q=acme`).
  - **What stays out:** what is only of the moment: a menu that is open, a row that is unfolded, a draft not sent.
    That is `useState`.
- **`useQueryParam(name)`** (from `@newt-js/react`) reads one param and changes it: `null` or `''` takes it out.
  The component reads the address and hands it to its service. The service never reads the URL:
  ```tsx
  const [status, setStatus] = useQueryParam('status')
  useEffect(() => { void clients.load({ status }) }, [clients, status])
  ```
  A param that changes as a person types (a search) is set when they stop or submit, never on every key.
- **A param's value is a word a person can read** (`?status=active`, never `?s=1`). It is the same in the address
  and in the API's query, when the API takes it.

## Composing, never styling

The app composes `@newt-js/react`. Outside `components/`:
- no `className`, `class` nor `style`;
- no element of the browser's own (`div`, `h1`, `p`…);
- no `cn`, Radix nor shadcn.

When something is missing, take the first step that solves it:

1. **A piece as it is:** `Button`, `Heading`, `Text`…
2. **Placed:** `Column` and `Row` take `gap`, `align`, `justify`, `padding`, `grow`, `fill`, `width` and `as`
   (`nav`, `aside`, `ul`, `li`, `form`… for what it is to the page). `Grid` for columns per breakpoint, `Container`
   to cap the width, `Spacer` to push to the end, `Scroll` for a part that scrolls on its own, `Sticky` for a
   header or a bar of actions that stays.
3. **A structure of the app's** (see Structure).
4. **A component of the app's own**, in `components/`, with class names: the last resort. Its doc comment says,
   on a line `Why: …`, why nothing in `@newt-js/react` composes it. If another app would want it too, it does not
   go here: say so to whoever asked.

## Structure

Pages that look alike are built alike, so the whole app is consistent.

- **Before building a screen, look for a structure of the app's that holds it**: a list page, a detail page, a form.
- **When a shape comes back on a second screen, make it a structure (no lint).** Then build both screens with it.
- **No structure is made ahead of need.** Each app has the ones its screens ask for, or the ones it is asked for.
- **Structures live in `components/layouts/`.** They are made of `Column`, `Row`, `Grid`, `Scroll`, `Sticky` and
  `Spacer`. They may style, but **as little as possible**. Each needs its `Why:`, and **is not made without saying
  so first to whoever asked (no lint)**: propose its shape, and wait for the yes.
- **Shared structures stay out of newt's packages (no lint).** If someone wants to share structures between
  apps, they go in a package of the project's own, never in newt's (`@newt-js/*`).
