# 📚 CampusNotes

> **The shared academic library for IEM students** — lecture notes, question papers, lab manuals and study resources, all in one place.

🌐 **Live:** [campusnotes-jhyn.onrender.com](https://campusnotes-jhyn.onrender.com)

---

## ✨ Features

- 🔐 **Google Sign-In** — secure authentication via Firebase
- 📂 **Browse & Search** — filter by year, semester, and category
- ⬆️ **Upload Resources** — share notes with drag & drop + upload progress
- ⬇️ **Download** — one-click file download for any resource
- 🔗 **Share** — native share on mobile, clipboard copy on desktop
- 🛡️ **Admin Panel** — publish, restrict, or permanently delete resources
- 🌙 **Dark / Light Theme** — persisted across sessions
- 📱 **Fully Responsive** — works on mobile, tablet, and desktop
- ⚡ **PWA Ready** — installable on Android & iOS home screen
- 🏷️ **NEW Badge** — highlights resources uploaded in the last 7 days

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS, Tailwind CSS (CDN), HTML5 |
| Backend | Node.js, Express 5 |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Firebase Firestore |
| File Storage | Cloudinary |
| Hosting | Render |

---

## 📁 Project Structure

```
CampusNotes/
├── backend/
│   ├── config/
│   │   ├── firebase.js          # Firebase Admin SDK init
│   │   └── serviceAccountKey.json  # ⚠️ gitignored — never commit
│   ├── routes/
│   │   └── api.js               # All API routes
│   └── server.js                # Express app entry point
├── frontend/
│   ├── css/
│   │   └── style.css            # Custom styles + dark theme
│   ├── js/
│   │   └── app.js               # All frontend logic
│   ├── manifest.json            # PWA manifest
│   └── index.html               # Single page app
├── .env                         # ⚠️ gitignored — never commit
├── .gitignore
└── package.json
```

---

## 🚀 Local Development

### Prerequisites
- Node.js ≥ 18
- A Firebase project with Firestore + Authentication enabled
- A Cloudinary account

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/campusnotes.git
cd campusnotes

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in your values (see Environment Variables below)

# 4. Add your Firebase service account
# Place serviceAccountKey.json in backend/config/

# 5. Start the dev server
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

---

## 🔑 Environment Variables

Create a `.env` file in the root:

```env
PORT=5000
NODE_ENV=development

FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_SERVICE_ACCOUNT_JSON= 

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

ADMIN_EMAILS=your@email.com
ALLOWED_ORIGINS=https://your-app.onrender.com
```

---

## 📡 API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/resources` | Public | Fetch all published resources |
| `GET` | `/api/search` | Public | Search & filter resources |
| `POST` | `/api/resources` | Login | Upload a new resource |
| `GET` | `/api/download/:id` | Public | Download a file |
| `GET` | `/api/admin/verify` | Login | Check admin status |
| `GET` | `/api/admin/resources` | Admin | Fetch all resources (any status) |
| `PATCH` | `/api/admin/resources/:id/status` | Admin | Update resource status |
| `DELETE` | `/api/admin/resources/:id` | Admin | Delete from Cloudinary + Firestore |
| `GET` | `/health` | Public | Health check |

---

## 🛡️ Admin Access

Add your email to `ADMIN_EMAILS` in `.env` (comma-separated for multiple):

```env
ADMIN_EMAILS=admin1@email.com,admin2@email.com
```

Admins can:
- View all uploaded resources (including pending)
- Publish or restrict resources
- Permanently delete files from Cloudinary and Firestore

---

## ☁️ Deploying to Render

1. Push code to GitHub
2. Create a **Web Service** on [render.com](https://render.com)
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `node backend/server.js`
5. Add all environment variables in the Render dashboard
6. Add your Render URL to **Firebase → Auth → Authorized Domains**
7. Create **Firestore composite indexes** for search queries

---

## 📸 Screenshots

| Home | Dark Mode | Admin Panel |
|---|---|---|
| <img width="1917" height="917" alt="image" src="https://github.com/user-attachments/assets/a4eae36c-eb19-4cab-9e3c-f2c93ee89d3a" />
 | <img width="1886" height="902" alt="image" src="https://github.com/user-attachments/assets/d86d0edb-82a8-44fc-bfcd-8aa8d93f05b3" />
 | <img width="1917" height="871" alt="image" src="https://github.com/user-attachments/assets/66870159-25b0-422b-866c-8c627db0584d" />
 |

---

## 🤝 Contributing

This project is built for IEM students by **Section D**. Pull requests are welcome!

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<div align="center">
  Made for IEM students · Section D · 2026
</div>
