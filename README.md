# Circle Physics Simulation

Circles simulation 2D with Typescript and **WebGL2**.

## Запуск

```bash
npm install
npm run dev
```

Types check: `npm run typecheck`, Build: `npm run build`, Local CI run: `npm run ci`, Preview: `npm run preview`.

## CI

`GitHub Actions` workflow:

- `push` to `main` / `master`
- each action `pull_request`
- steps: `npm ci` -> `npm run ci`
- after built - published dir -> `dist`
