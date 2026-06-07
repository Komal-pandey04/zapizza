# 🍕 Zapizza — Full Stack Backend

A complete Node.js + Express + SQLite backend with a beautiful Admin Panel for the Zapizza pizza brand website.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```

### 3. Open in browser
- **Admin Panel:** http://localhost:3001
- **API Base:** http://localhost:3001/api

### 4. Login credentials
| Field    | Value         |
|----------|---------------|
| Username | `admin`       |
| Password | `zapizza123`  |

---

## 📁 Project Structure

```
zapizza/
├── server.js              # Express app entry point
├── package.json
├── README.md
├── .env.example           # Environment variables template
├── db/
│   └── database.js        # SQLite setup, schema, seed data
├── middleware/
│   └── auth.js            # JWT auth middleware
├── routes/
│   ├── auth.js            # Login / me
│   ├── menu.js            # Menu items + categories
│   └── orders.js          # Orders CRUD + stats
└── public/
    └── index.html         # Full Admin Panel UI
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint         | Auth | Description       |
|--------|-----------------|------|-------------------|
| POST   | /api/auth/login  | ✗    | Login, get JWT    |
| GET    | /api/auth/me     | ✓    | Current user info |

### Menu
| Method | Endpoint                    | Auth | Description              |
|--------|----------------------------|------|--------------------------|
| GET    | /api/menu                   | ✗    | All items by category    |
| GET    | /api/menu/items             | ✓    | All items flat (admin)   |
| GET    | /api/menu/items/:id         | ✓    | Single item              |
| POST   | /api/menu/items             | ✓    | Create item              |
| PUT    | /api/menu/items/:id         | ✓    | Update item              |
| PATCH  | /api/menu/items/:id/toggle  | ✓    | Toggle availability      |
| DELETE | /api/menu/items/:id         | ✓    | Delete item              |
| GET    | /api/menu/categories        | ✗    | All categories           |
| POST   | /api/menu/categories        | ✓    | Create category          |

### Orders
| Method | Endpoint                  | Auth | Description              |
|--------|--------------------------|------|--------------------------|
| GET    | /api/orders               | ✓    | List orders (paginated)  |
| GET    | /api/orders/stats         | ✓    | Dashboard stats          |
| GET    | /api/orders/:id           | ✓    | Order + items detail     |
| POST   | /api/orders               | ✗    | Place new order          |
| PATCH  | /api/orders/:id/status    | ✓    | Update order status      |
| DELETE | /api/orders/:id           | ✓    | Delete order             |

---

## 🗄️ Database Schema

### `users`
| Column     | Type    |
|------------|---------|
| id         | INTEGER |
| username   | TEXT    |
| password   | TEXT (bcrypt) |
| role       | TEXT    |
| created_at | DATETIME |

### `categories`
| Column     | Type    |
|------------|---------|
| id         | INTEGER |
| name       | TEXT    |
| slug       | TEXT    |
| sort_order | INTEGER |

### `menu_items`
| Column      | Type    |
|-------------|---------|
| id          | INTEGER |
| category_id | INTEGER |
| name        | TEXT    |
| description | TEXT    |
| price       | REAL    |
| image_url   | TEXT    |
| tag         | TEXT    |
| available   | INTEGER |
| sort_order  | INTEGER |
| created_at  | DATETIME |

### `orders`
| Column           | Type    |
|------------------|---------|
| id               | INTEGER |
| order_number     | TEXT    |
| customer_name    | TEXT    |
| customer_phone   | TEXT    |
| customer_address | TEXT    |
| order_type       | TEXT (delivery/dine-in) |
| status           | TEXT    |
| subtotal         | REAL    |
| tax              | REAL    |
| total            | REAL    |
| notes            | TEXT    |
| created_at       | DATETIME |
| updated_at       | DATETIME |

### `order_items`
| Column       | Type    |
|--------------|---------|
| id           | INTEGER |
| order_id     | INTEGER |
| menu_item_id | INTEGER |
| name         | TEXT    |
| price        | REAL    |
| quantity     | INTEGER |
| subtotal     | REAL    |

---

## 🧪 Example API Calls

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"zapizza123"}'
```

### Get Menu (public)
```bash
curl http://localhost:3001/api/menu
```

### Place Order (public)
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Rahul Sharma",
    "customer_phone": "9876543210",
    "order_type": "delivery",
    "customer_address": "12 MG Road, Delhi",
    "items": [
      {"menu_item_id": 1, "quantity": 2},
      {"menu_item_id": 3, "quantity": 1}
    ]
  }'
```

### Update Order Status (admin)
```bash
curl -X PATCH http://localhost:3001/api/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status":"preparing"}'
```

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and edit:

```env
PORT=3001
JWT_SECRET=your_super_secret_key_here
```

---

## 🔗 Connect to the Frontend

In your `pizza-brand.html`, the order form can POST to:

```javascript
fetch('http://localhost:3001/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...orderData })
})
```

---

## 📦 Tech Stack

| Layer     | Technology              |
|-----------|------------------------|
| Runtime   | Node.js                |
| Framework | Express 4              |
| Database  | SQLite via sql.js      |
| Auth      | JWT + bcryptjs         |
| Admin UI  | Vanilla HTML/CSS/JS    |

---

## Order Status Flow

```
pending → confirmed → preparing → ready → delivered
                                        ↘ cancelled
```
