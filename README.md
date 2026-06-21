# TrustBridge - Secure LAN Communication System

## 📁 Project Structure

```
.
├── backend
│   ├── package.json
│   ├── server.js
│   └── src
│       ├── app.js
│       ├── config
│       │   ├── constants.js
│       │   ├── database.js
│       │   └── encryption.js
│       ├── middleware
│       │   ├── auth.js
│       │   ├── error.js
│       │   └── zero-trust.js
│       ├── modules
│       │   ├── auth
│       │   ├── crypto
│       │   ├── file-transfer
│       │   ├── messaging
│       │   ├── user
│       │   └── websocket
│       └── utils
│           ├── logger.js
│           └── validators.js
├── docker-compose.yml
├── frontend
│   ├── next.config.js
│   ├── package.json
│   └── src
│       ├── app
│       │   ├── (auth)
│       │   ├── (dashboard)
│       │   ├── layout.js
│       │   └── page.js
│       ├── components
│       │   ├── admin
│       │   ├── common
│       │   ├── super-user
│       │   ├── team-lead
│       │   └── team-member
│       ├── lib
│       │   ├── api
│       │   ├── crypto
│       │   ├── store
│       │   └── websocket
│       └── styles
│           └── globals.css
└── README.md

29 directories, 18 files
```

## 🚀 Tech Stack
- **Frontend:** Next.js 14 (App Router)
- **Backend:** Node.js + Express
- **Real-time:** Socket.io
- **Database:** PostgreSQL / SQLite
- **Encryption:** AES-GCM
- **Security:** Zero Trust Architecture
- **Authentication:** JWT + bcrypt

## 📦 Modules
- **Auth Module:** Login/Logout, Session Management
- **Crypto Module:** AES-GCM Encryption/Decryption
- **User Module:** RBAC with 5 roles (Admin, Super User, Team Lead, Team Manager, Team Member)
- **Messaging Module:** Real-time chat
- **File Transfer Module:** Secure file sharing
- **WebSocket Module:** Real-time communication

## 🔐 User Roles
1. **Admin** - Full system management
2. **Super User** - Company owner, receives updates
3. **Team Lead** - Manages team managers and members
4. **Team Manager** - Manages team members
5. **Team Member** - End user

## 🛠️ Setup Instructions
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 📝 Status
- [x] Project structure created
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Database setup
- [ ] Authentication implemented
- [ ] Encryption implemented
- [ ] User roles implemented
- [ ] Chat implemented
- [ ] File transfer implemented

# TrustBridge
