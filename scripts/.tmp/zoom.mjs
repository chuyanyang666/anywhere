import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 }, deviceScaleFactor: 3 });
const p = await ctx.newPage();
await p.addInitScript(() => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } })));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);

const info = await p.evaluate(() => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), b: +b.bottom.toFixed(1) };
  };
  const card = document.querySelector('.cal-card');
  const grid = document.querySelector('.mini-grid');
  const cells = [...document.querySelectorAll('.mini-cell')];
  const last = cells[cells.length - 1];
  const todo = document.querySelector('.todo-card');
  const todoList = document.querySelector('.todo-list');
  const todoFoot = document.querySelector('.todo-foot');
  const todoInput = document.querySelector('.todo-input');
  const rows = [...document.querySelectorAll('.todo-row')];
  return {
    card: r(card),
    grid: r(grid),
    gridScroll: grid ? { sh: grid.scrollHeight, ch: grid.clientHeight } : null,
    cellCount: cells.length,
    lastCell: r(last),
    todo: r(todo),
    todoList: r(todoList),
    todoListScroll: todoList ? { sh: todoList.scrollHeight, ch: todoList.clientHeight } : null,
    todoFoot: r(todoFoot),
    todoInput: r(todoInput),
    rows: rows.map(r),
    cardOverflow: card ? { sh: card.scrollHeight, ch: card.clientHeight } : null,
  };
});
console.log(JSON.stringify(info, null, 2));

await p.screenshot({ path: 'scripts/shots/zoom-dash.png', clip: { x: 85, y: 280, width: 700, height: 175 } });
await b.close();
