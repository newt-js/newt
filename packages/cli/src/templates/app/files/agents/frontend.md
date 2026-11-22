# Frontend

How a context's app (`src/contexts/<context>/app/`) is built: React, with `@newt-js/client` (what the app thinks
with) and `@newt-js/react` (what it is made of). Read it top to bottom once. Building a screen is the last part.

newt's lint holds most of this: run it after every change and fix what it says. What it cannot see is marked
**(no lint)**: keep to it all the same.

## The idea

**Every piece of the app has one home, and the home says what it may do.** An app stays easy to change as it grows
because nobody has to guess where something is, or who changed it.

One request for a screen goes down through these, each only talking to the next:

```
URL           /backoffice/clients?status=active       what a person is looking at
 └ route      app.routes.tsx → features/clients/      which feature answers it
   └ feature  clients.tsx: <Provide ClientsService>   where its state is born and dies
     └ components  read with useValue, call methods   what is painted, and nothing else
       └ service   Store, its api, events             what the screens hold, and what changes it
         └ api     ClientsApi extends Requester       the only talk with the backend
```

Going back up, the service's signals change and only the components that read them paint again.

## Where each thing lives

Ask what it is, and take the first answer that fits:

| It is… | It lives in… |
|---|---|
| What a person chose to look at: which thing, which tab, which filters, order, page or search | **the URL**: a path segment (`/clients/:clientId`) or a query param (`?status=active`) |
| What only one component needs for a moment: a menu open, a row unfolded, a draft | **`useState`** in that component, or its closest ancestor if two need it |
| What a feature's screens show, from the backend, and how it changes: a list, a form being filled | **the feature's service**, provided at the lowest component that holds all who use it; a list in a `ListStore`, a form in a `FormStore` |
| What the whole app needs: the session, the user and permissions, the theme | **`services/<name>/`**, the app's own |
| That something changed, which another feature shows | **an event** on the `EventBus`, named as the backend's (`client.updated`) |
| A request to the backend | **`<feature>.api.ts`**, beside its service |
| How something looks | **`@newt-js/react`**, composed; a structure in `components/layouts/`; in the end, `components/` |

The URL comes first on purpose. A screen whose state is in the address can be shared, kept, opened in another
tab and gone back to (no lint).

## The map

```
app/
  index.html           the page Bun serves; it links app.css and loads main.tsx
  app.css              imports @newt-js/react/theme.css
  main.tsx             mounts the app; sets Requester.baseUrl to the context's API
  app.tsx              <Router basename={BASE}> around the routes, and the app's providers
  app.routes.tsx       the shell's route, and one lazy route per feature
  base.ts              where the backend serves the app, and its API
  pages/               the frame and the errors, with no state: shell/, not-found/
  features/<feature>/  one folder per part of the business: clients, sessions, home…
  services/<name>/     what belongs to the whole app
  guards/              who may see which routes: a `Guard` with the app's own rule
  components/          the app's own components: the one place with class names
    layouts/           the app's structures
```

Nothing else goes at the root. A feature, with everything it may hold:

```
features/clients/
  clients.tsx              its root: <Provide services={[ClientsService]}> and its routes
  clients.routes.tsx       its own routes: clients/:clientId, clients/new
  clients.state.ts         the state's shape and its first value
  clients.service.ts       the state, and what changes it
  clients.api.ts           its requests
  clients-list.tsx         a part split out of clients.tsx
  clients-list-row/        a part that split again
    clients-list-row.tsx
    clients-list-row-menu.tsx
```

- **Names say where a file lives.** Everything inside a folder is named after it (`clients-list.tsx`), and its
  root is the plain name (`Clients`).
- **A feature has no `components/` of its own.**
- **A feature imports no other feature.** Features hear each other through events.
- **`pages/` holds no state.** Anything that shows the business is a feature, however small; the home too.

## The layers

### URL and routes

- **The router comes from `react-router`, set up once.** `<Router basename={BASE}>` (from `@newt-js/react`) in
  `app.tsx` starts every route and link at the context's path. Every link and `Button href` goes through it.
- **The shell wraps every page.** `pages/shell/shell.tsx` is a layout route: the frame (navigation, brand, user)
  around `<Suspense><Outlet /></Suspense>`. A feature never imports it.
- **Every feature is lazy**, with `lazy()` in `app.routes.tsx`: nobody downloads what they do not open. There is no
  loader: a page shows what it has as it comes.
- **A private part is a layout route with a guard.** `guards/signed-in.tsx` renders
  `<Guard allows={session.signedIn} otherwise="/sign-in" />` with a signal of `services/session/`; the routes inside
  it are seen only while it is `true`, and who is sent away comes back through `?next=`. A guard only hides: the
  backend is what refuses the data.
- **`Tabs` keeps the open tab in the URL by itself.** For anything else,
  `useQueryParam(name)` reads one query param and sets it; `null` or `''` takes it out.
- **A param's value is a word a person reads** (`?status=active`, never `?s=1`) **(no lint)**. Where the API takes
  the same filter, the param has the same name and value there.
- **A search is set in the URL when the person stops typing or submits, never on every key (no lint).**

### Services and state

- **A service is a class built with no arguments.** It gets what it needs with `inject(Other)`. It holds its state in a
  `Store`, and hands parts of it out as read-only signals with `select`, as fields.
- **A service is shaped by its screens, not by the business (no lint).** It holds what they show, as they show it.
  The rules of the business are the backend's.
- **A service never reads the URL (no lint).** The component reads the URL and passes it to a method, as in
  `load({ status })`.
- **Its constructor does nothing but set up (no lint).** It loads when a component calls it, and `load()` may run
  twice: StrictMode does that in development.
- **A list is a `ListStore`, a form a `FormStore`**, as fields of the service:
  - `new ListStore((filters, cursor) => this.api.list({ ...filters, cursor }))` asks the backend page by page, as it
    pages (`size`, `cursor`). `load(filters)` starts again, `more()` adds the next page, and an answer that comes
    after a newer load is dropped. There are no page numbers: the list goes on with a `LoadMore` under it or, for a
    long one, with a virtual scroll that calls `more()` as the end comes near. Choose what fits the screen.
  - `new FormStore(schema, initial)` holds the values and what is wrong with them. `submit(values => this.api.create(values))`
    checks them with the schema first (zod, or any Standard Schema), and shows by its field what the backend found
    wrong. The schema is the app's own: copy the module's rules into it, never import the backend. A component ties each control with `useFormField(form, 'name')`, inside `Form`.
- **It is provided where its part of the screen is.** `<Provide services={[ClientsService]}>` gives that part its
  own instance, released (`dispose`) when it goes away. A service nobody provides is one for the whole app.

### Backend and events

- **Only `<feature>.api.ts` talks to the backend.** It is a class extending `Requester`, with its `path` and one
  method per request. A failed request is an `ApiError` (`status`, `message`, `code`, and `issues` by field when the
  input was not valid).
- **What another feature must know is an event (no lint).**
  - The service that changed something emits it: `this.events.emit('client.updated', { id })`.
  - Those that show it listen with `on`, stop in their `dispose`, and load again.
  - A payload is JSON: ids, and little else.
  - In real time, the server's events reach the same listeners through `EventBus.receive`, so a feature never
    cares where an event came from.

### Components

- **A component paints what a service holds and calls its methods.** That is all it does: no requests, no rules.
- **It reads a signal with `useValue`**, which paints it again when, and only when, that signal changes. Reading
  `.value` while rendering gives a value that never repaints; `.value` belongs in a handler, an effect or a service.

### How it looks

The app composes `@newt-js/react` and never styles it. Outside `components/` it writes:
- no `className`, `class` nor `style`;
- no element of the browser's own (`div`, `h1`, `p`…);
- no `cn`, Radix nor shadcn.

So every screen of every app looks the same. When something is missing, take the first step that solves it:

1. **A piece as it is.** `@newt-js/react` wraps every component of shadcn, and each one's doc comment says when it
   fits and when another does:
   - forms: `Field` and its controls (`Input`, `Select`, `Combobox`, `DatePicker`…), `Form`;
   - data: `Table`, `Card`, `Item`, `Badge`, `Alert`, `Empty`, `Chart`…;
   - layers: `Dialog`, `ConfirmDialog`, `Sheet`, `Menu`, `Tooltip`, `CommandPalette`, `toast`…;
   - navigation: `Tabs`, `Breadcrumb`, `SidebarLayout` (the shell's frame);
   - text: `Heading`, `Text`.
2. **Pieces placed:**
   - `Column` and `Row` take `gap`, `align`, `justify`, `padding`, `grow`, `fill`, `width`, and `as` for what they
     are to the page (`nav`, `aside`, `ul`, `li`, `form`…).
   - `Grid` lays out columns per breakpoint, and `Container` caps the width.
   - `Spacer` pushes what follows to the end, `Scroll` scrolls a part on its own, and `Sticky` keeps a header or a
     bar of actions in place.
3. **A structure of the app's.** Screens that look alike are built alike:
   - Before building a screen, look in `components/layouts/` for one that holds it: a list page, a detail page, a form.
   - When a shape comes back on a second screen, make it a structure and build both with it (no lint).
   - None is made ahead of need.
   - A structure is made of the pieces above and styles as little as it can. It says why in a line `Why: …`. It is
     never made without first proposing its shape to whoever asked and waiting for the yes (no lint).
4. **A component of the app's own**, in `components/`, with class names: the last resort.
   - Its doc comment says, on a line `Why: …`, why nothing in `@newt-js/react` composes it.
   - If another app would want it too, say so to whoever asked.
   - What apps share lives in a package of the project's own, never in newt's (`@newt-js/*`) (no lint).

## Growing

A piece that grows is split before it is hard to read. The lint stops these:

| Piece | Limit |
|---|---|
| Component file | 100 lines |
| JSX | nested 4 deep |
| Component | 1 `useService`, 3 `useValue` |
| Service | 150 lines, 7 public methods, 3 `inject()` |

- **A component that grows** gets a part split out, beside it and named after it (`clients-list-row.tsx`). The part
  gets its own folder only when it splits again.
- **A component that reads many values** gets one `computed` from its service, holding what it shows.
- **A service that grows** is split by part of the screen. Each part is provided where it is (`clients-detail/`
  gets a `ClientsDetailService`).
- **A service that injects too much** depends on too much. Let an event tell it instead.

## Building a screen

A new feature starts with `bunx newt add feature <context>/<feature>`: its folder, its root with its service, its api,
and its lazy route. With `--module <module>`, it also lists that module a page at a time and adds to it with a form,
the rules of its create copied: a screen that works, to change from there. Never write that start by hand.

What it writes, from the outside in, for a list of clients filtered by status:

1. **Its address.** `/clients?status=active`: the route in `app.routes.tsx`, lazy, and the filter as a query param.
2. **Its requests**, in `clients.api.ts`:

   ```ts
   export class ClientsApi extends Requester {
     protected readonly path = '/clients'

     list(params: { status?: string | undefined, cursor?: string | undefined }) {
       return this.get<Page<ClientDTO>>('', params)
     }
   }
   ```

3. **Its service**, holding what the screen shows:

   ```ts
   export class ClientsService {

     private readonly api = inject(ClientsApi)
     readonly list = new ListStore<ClientDTO, { status?: string | undefined }>(
       (filters, cursor) => this.api.list({ ...filters, cursor }),
     )
   }
   ```

4. **Its root**, which gives the screen the service: `clients.tsx` renders
   `<Provide services={[ClientsService]}>` around its routes.
5. **Its components**, reading the URL and the service, and composed of `@newt-js/react`:

   ```tsx
   export function ClientsList() {
     const clients = useService(ClientsService)
     const items = useValue(clients.list.items)
     const [status] = useQueryParam('status')
     useEffect(() => {
       void clients.list.load({ status: status ?? undefined })
     }, [clients, status])
     return (
       <Column gap={4}>
         <Column as="ul">{items.map(client => <ClientsListRow key={client.id} client={client} />)}</Column>
         <LoadMore list={clients.list} />
       </Column>
     )
   }
   ```

6. **Its look.** If another screen already has this shape, use its structure from `components/layouts/`. If this
   is the second screen with it, propose one.
7. **Its edges.** If it changes what another feature shows, emit the event. If the lint says it grew, split it.
8. **Check it.** Run the lint, the types and the tests, then open it in the browser at its address.
