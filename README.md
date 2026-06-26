# Circle Physics Simulation

Circles simulation 2D with Typescript and **WebGL2**.

## Run / Запуск

```bash
git switch develop

npm install
npm run dev
```
client run on `127.0.0.1` prefferably than `localhost`

Types check: `npm run typecheck`, Build: `npm run build`, Local CI run: `npm run ci`, Preview: `npm run preview`.

## CI

`GitHub Actions` workflow:

- `push` to `main` / `master`
- each action `pull_request`
- steps: `npm ci` -> `npm run ci`
- after built - published dir -> `dist`


## Architecture Description
Краткое описание архитектуры:

main.ts        - Входной файл, также оркестратор приложения - хранит состояния режима игры и объектов , 
                 переводит UI и input с данными, крутит игровой цикл

collision.ts   - модуль расчёта коллизий и столкновений объектов кружков

physics.ts     - соделржит физические настройки и логику симмуляции, для передачи (через публичные API) в main.ts

input.ts       - слушает события пользователя, действие сообщает main.ts

ui.ts          - описывает интерфейс окна пользователь

renderer.ts    - слой отрисовки массива объекта кугов (circles[]) через WebGL 2


// при пересчёте коллизий используется narrow-phase для кругов, т.к. broad-phase излишен
