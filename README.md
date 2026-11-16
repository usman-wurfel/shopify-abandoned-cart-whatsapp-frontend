# AI Abandoned Cart on WhatsApp — Frontend

Shopify embedded admin app (React / Next.js) for recovering abandoned carts via WhatsApp — manual sends and automated flows with merchant WhatsApp API configs.

**Live on Shopify App Store:** [AI Abandoned Cart On Whatsapp](https://apps.shopify.com/aboundent-cart-whatsapp)

> Portfolio showcase of production frontend work. Backend is a separate Laravel API. Screenshots will be added under `docs/screenshots/`.

---

## Overview

Merchants lose revenue when shoppers abandon checkout. This app reconnects them on WhatsApp:

- View abandoned carts in real time inside Shopify Admin
- Send recovery messages manually or on a delay schedule
- Connect the merchant’s own WhatsApp API for automation
- Track delivery logs, templates, packages/subscriptions, and customer settings (DND / daily limits)

Built as a **Shopify embedded app** with App Bridge + Polaris, talking to a Laravel backend over authenticated APIs.

---

## Role & responsibility

| Area | Contribution |
|------|----------------|
| Frontend architecture | Next.js 14 App Router, TypeScript, embedded Shopify UX |
| Shopify integration | App Bridge, session token bridge, Polaris UI |
| Product UI | Dashboard, carts, WhatsApp configs, templates, packages, admin |
| API client | Axios layer, auth/session handling, protected routes |
| UX polish | Loading/error states, subscription guards, branding theme |

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Framework | **Next.js 14** (App Router), **React 18**, **TypeScript** |
| Shopify | **@shopify/app-bridge**, **@shopify/app-bridge-react**, **@shopify/polaris** |
| Styling | **Tailwind CSS**, Polaris design system, WhatsApp-oriented branding |
| HTTP | **Axios** |
| Charts / UI | **Recharts**, **Lucide**, **React Quill**, **React Toastify** |
| Backend (paired) | **Laravel** REST API (auth, carts, WhatsApp configs, billing) |

---

## App modules (frontend)

```
app/
├── page.tsx                 # Dashboard
├── abandoned-carts/         # Cart list & recovery actions
├── whatsapp-configs/        # Merchant WhatsApp API configs
├── message-templates/       # WhatsApp message templates
├── customers/               # Customer-related views
├── packages/                # Pricing plans
├── select-package/          # Plan selection (Shopify billing flow)
├── subscription-history/    # Billing history
├── settings/                # DND & daily limits
├── profile / login / register / set-password
└── admin/subscriptions/     # Admin subscription management

components/                  # App Bridge bridge, guards, nav, layout
lib/                         # Auth, axios, session token helpers
contexts/                    # Embedded path & timezone
```

---

## Product highlights (from live listing)

- Manual WhatsApp messages for abandoned carts  
- Automated messaging via merchant WhatsApp API keys  
- Custom delay before send  
- Real-time abandoned cart tracking  
- Dashboard analytics  
- Free + paid plans ($8.99 / $14.99 monthly tiers on App Store)

---

## Screenshots

Place images here (coming soon):

```
docs/screenshots/
├── 01-dashboard.png
├── 02-abandoned-carts.png
├── 03-whatsapp-config.png
├── 04-message-templates.png
└── 05-packages.png
```

<!-- After you add files, uncomment:

![Dashboard](docs/screenshots/01-dashboard.png)
![Abandoned carts](docs/screenshots/02-abandoned-carts.png)

-->

---

## Local setup (dev)

```bash
npm install
cp .env.example .env.local   # if present, or create manually
npm run dev
```

Example env (placeholders only — never commit real keys):

```env
NEXT_PUBLIC_SHOPIFY_API_KEY=your_shopify_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Requires a running Laravel API with CORS + auth configured.

---

## Notes

- This repository is the **merchant-facing React/Next.js frontend** of a production Shopify app.  
- Credentials and production `.env` files are **not** included.  
- Built while working with WebExert; listed publicly on the [Shopify App Store](https://apps.shopify.com/aboundent-cart-whatsapp).

---

## Author

**Muhammad Usman** — Full-Stack Developer  
[GitHub](https://github.com/usman-wurfel) · [LinkedIn](https://www.linkedin.com/in/muhammad-usman-ali-311418221)
