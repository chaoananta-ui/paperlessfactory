# 🏭 MQMS Paperless Factory Command Center

A high-end, real-time reporting and analytics dashboard for industrial factory operations. This system digitizes shift reports, QC verification, and audit forensics across multiple sheds.

## 🚀 Premium Features

- **Global Command Console**: Centralized control for all sheds (1, 2, and 3).
- **Audit Forensics**: Deep-dive audit logs with CSV export for compliance.
- **Interactive Analytics**: Real-time KPI tracking with PDF & Excel export capabilities.
- **System Kill Switch**: Global maintenance mode to instantly lockdown operations.
- **OTA Push Updates**: Force-refresh all connected client screens immediately.
- **Live Performance Monitoring**: Real-time throughput and health metrics.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Node.js, Express, Prisma ORM.
- **Database**: SQLite (Production-ready for local/VPS deployment).

## 📦 Deployment Guide

### Frontend (Netlify)
1. Link your GitHub repository to Netlify.
2. Set the build command to `npm run build` and publish directory to `client/dist`.
3. Add `VITE_API_URL` to your environment variables pointing to your backend.

### Backend (Render / Railway)
1. Link your GitHub repository.
2. Set the root directory to `server`.
3. Run `npx prisma generate` and `npm start`.

## 👤 Admin Access
- **Default ID**: `DEVELOPER`
- **Default Password**: `PASSWORD`

---
*Built for MQMS Paperless Reporting System*
