# SeatGo Backend (Node.js + Express + MongoDB)

## 1) Prérequis
- Node.js 18+
- MongoDB local (ou Atlas)

## 2) Installation
```bash
cd seatgo-backend
npm install
cp .env.example .env
```

## 3) Lancer la base (MongoDB local)
Assure-toi que MongoDB tourne sur `mongodb://127.0.0.1:27017`.

## 4) Seed (insérer des trajets de test)
```bash
npm run seed
```

## 5) Lancer le serveur
```bash
npm run dev
```
API: http://localhost:5000

## 6) Endpoints principaux
### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET  `/api/auth/me` (JWT)

### Trips
- GET `/api/trips?departure=Lomé&destination=Kara&date=2026-03-02`
- GET `/api/trips/:id`
- GET `/api/trips/:id/seats`  (sièges pris)

### Bookings
- POST `/api/bookings` (JWT)
- GET  `/api/bookings/me` (JWT)
- GET  `/api/bookings/:id` (ticket public par ID)

## 7) Note “paiement”
Le paiement Flooz/TMoney est **simulé** pour coller au frontend actuel:
- On crée la réservation et on la marque `PAID` immédiatement.
- Tu pourras plus tard brancher un vrai provider (webhook).

