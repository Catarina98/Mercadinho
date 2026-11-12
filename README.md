# 🛒 Mercadinho POS - Smart Barcode & QR Scanner Point of Sale

A mobile-first **Point of Sale (POS)** and **Sales Analytics** web application designed specifically for market vendors, artisan fairs, pop-up stores, and small retailers. The app is hosted on **GitHub Pages** and requires an internet connection and an authorized Supabase account.

![GitHub Pages Ready](https://img.shields.io/badge/GitHub%20Pages-Ready-emerald?style=flat-square&logo=github)
![Barcode & QR](https://img.shields.io/badge/Scanner-Barcode%20%26%20QR-purple?style=flat-square)

---

## ✨ Features

### 1. 📷 Live Barcode & QR Code Mobile Camera Scanner
- **Mobile Optimized**: Fast live camera scanner (`html5-qrcode`) with rear camera selection, flashlight/torch toggle, and continuous scan mode.
- **Multiple Formats**: Decodes **EAN-13**, **EAN-8**, **UPC-A**, **UPC-E**, **Code 128**, **Code 39**, and **QR Codes**.
- **Tactile Audio & Haptics**: Pleasant chirps on successful scan, alert tone on unknown items, and phone vibration via the Web Audio API.
- **Manual Input**: Quick manual barcode/SKU input bar when camera is not in use.

### 2. 🛍️ Dynamic Cart with Instant Quantity Multiplier
- **No repetitive scanning**: Tap quantity steppers or open the rapid numeric keypad to set any quantity (`10x`, `25x`, `50x`) in one click.
- **Instant Search & Quick-Tap Grid**: Search by product name, barcode, or filter by category.
- **Automatic Stock Tracking**: Decrements inventory on completed sales.

### 3. 📍 Market & Selling Location Context
- **Where are you selling?**: Define and switch active market locations (e.g. *Feira da Ladra*, *Mercado da Ribeira*, *Artisan Weekend Lisboa*).
- **Location Tagging**: Every sale is recorded with the exact timestamp (date & time) and the active market location.

### 4. 💳 Checkout & Instant Receipts
- **Payment Methods**: Cash with fast bill buttons and automatic change calculator (*Troco*), Card / Multibanco, and MBWay / QR.
- **Digital & Printable Receipts**: Formatted for standard paper and thermal roll receipt printers (`window.print()`).
- **Shareable Summary**: 1-click copy receipt text to clipboard or send via messaging apps.

### 5. 📊 Rich Analytics & Graph Dashboard (Chart.js)
- **Monthly & Daily Revenue Trends**: Interactive gradient charts showing income over 7 days, 30 days, 6 months, 1 year, or all time.
- **Sales by Market**: Visual breakdown and ranking of which market locations generate the highest revenue.
- **Top Selling Products**: Ranked horizontal bar charts by revenue and total units sold.
- **Category Distribution**: Doughnut charts displaying sales per category.
- **Key Metrics**: Total Income, Average Ticket Value (*Ticket Médio*), Total Units Sold, Top Location.

### 6. 🏷️ Product Catalog & Barcode Label Sticker Generator
- Full product & category CRUD (Name, Price, Barcode, Stock, Category, Color).
- **Auto-Generate EAN Barcodes**: 1-click realistic 13-digit EAN generator.
- **Printable Sticker Sheets**: Generates scannable Barcode & QR code sticker sheets formatted for A4 label stickers or thermal sticker rolls ready to print!

### 7. 💾 Account access and exports
- **Account access**: Sign in when opening the app. Inventory and sales are synchronized with Supabase.
- **Local backups**: Export sales, products, and markets from the device to a single `.json` file.
- **Spreadsheet Export**: 1-click export of sales history and product catalog to `.csv`.

---

## 🚀 How to Run Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mercadinho.git
   cd mercadinho
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key. See [Supabase setup](SANITY-INTEGRATION.md).

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser or local network on your mobile phone!

5. **Build production bundle**:
   ```bash
   npm run build
   ```

---

## 🌐 How to Deploy to GitHub Pages

### Method 1: Automatic Deployment with GitHub Actions (Recommended)
This repository includes a ready-to-use GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Mercadinho POS"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/mercadinho.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages**
   - Under **Build and deployment** > **Source**, select **GitHub Actions**
3. Your app will automatically build and publish to `https://YOUR_USERNAME.github.io/mercadinho/` on every push!

---

## 📱 Mobile Scanner Tips
- For best results on mobile, allow camera access when prompted by the browser.
- Use the **Products & Labels** tab to print test barcode stickers or display barcodes on a secondary screen to test scanning.

---

## 📄 License
MIT License. Free to use for personal and commercial pop-up stalls and small markets!
