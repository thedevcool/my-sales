# Sales POS & Inventory

A white-label point-of-sale and inventory system for small retail shops. The
owner sets up their store in a quick first-run wizard — business name, currency,
accent colour, and their own admin account — then sales reps ring up sales from a
fast, mobile-first POS while the owner manages products, stock and staff from a
dashboard.

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**,
**Prisma + SQLite**, and **NextAuth**.

## Features

**First-run setup (no config files)**

- Guided 3-step wizard at `/setup`: business name & tagline, currency symbol,
  accent colour (8 presets with live preview), the owner's admin account, and an
  optional starter catalogue. Branding then flows through the whole app.
- Everything is editable later from **Admin → Settings**.

**Sales reps**

- Fast product search (name, SKU or barcode) with a live cart
- Per-line price overrides (never below the product's minimum) and discounts
- One-tap checkout with Cash / Transfer / POS, recorded transactionally
- Personal sales history with revenue & profit summary

**Admins**

- Dashboard: sales, profit, transactions, stock, low-stock alerts, a 7-day
  sales chart, payment-method split and top products
- Sales log across all staff, filterable by period & rep, with CSV export
- Product catalogue: add, edit pricing, hide/show, and restock
- Inventory view with stock value and one-click restock (audited)
- Staff management: add reps with individual logins, reset passwords,
  activate/deactivate

Every sale is attributed to the rep who made it — each rep has a unique login.

## Getting started

```bash
npm install
npm run db:push      # create the SQLite database from the schema
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — with an empty database you'll
be taken straight to the **setup wizard** to create your store.

### Try the demo instead

To skip the wizard and load a ready-made demo (a shop called “FadaTech” with
sample products and staff):

```bash
npm run db:seed
```

| Role  | Username | Password   |
| ----- | -------- | ---------- |
| Admin | `admin`  | `admin123` |
| Rep   | `favour` | `my123`    |

Other reps: `aisha`, `musa`, `sandra`, `chinedu`, `deborah` (same password).

## Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start the dev server              |
| `npm run build`     | Production build                  |
| `npm run start`     | Run the production build          |
| `npm run db:push`   | Apply the Prisma schema to the DB |
| `npm run db:seed`   | Load the demo store               |
| `npm run db:studio` | Open Prisma Studio                |
| `npm run test`      | Run the test suite (Vitest)       |

## Notes

- Sales are written in a single database transaction (stock check, price
  validation, inventory decrement and sale records all succeed or fail
  together), so the success screen only appears once the sale is truly saved.
- Money is stored as whole integers to avoid floating-point rounding; the
  display symbol is whatever the owner chose during setup.
- Branding is a single-tenant setting stored in the database (one store per
  deployment).
