# Coffee Shop Aurora
Yeskermes Gulnaz 
---

This project is a small Coffee Shop backend with authentication (JWT), user profile, and a “resource” (table reservations) CRUD.  
It also integrates external APIs (Weather + Unsplash) to demonstrate 3rd-party integration.

**Live Deployment (Render):** https://coffee-shop-tfdz.onrender.com/

---

## 1) Project Overview

### Main features
- **Auth:** Register/Login with **JWT**
- **User profile:** Get/Update logged-in user profile
- **Reservations (Resource):** Create / Read / Update / Delete reservations (private per user)
- **Security:**
  - Password hashing with **bcrypt**
  - Private endpoints protected by **JWT middleware**
  - **Ownership check** for resources (returns **403 Forbidden** if not your resource)
- **External APIs:**
  - **Weather API** (no DB changes, returns current weather)
  - **Unsplash API** (random photos by query)

---

## 2) Tech Stack
- Node.js, Express.js
- MongoDB Atlas + Mongoose
- JWT (jsonwebtoken)
- bcryptjs
- morgan
- Render (deployment)

---

## 3) Project Structure (Modular)
```
coffee-shop/
public/
index.html
auth.html
reservations.html
css/style.css
js/auth.js
js/home.js
js/reservations.js
js/client.js
src/
config/
db.js
controllers/
authController.js
userController.js
reservationController.js
externalController.js
middleware/
authMiddleware.js
errorHandler.js
models/
User.js
Resource.js
routes/
authRoutes.js
users.js
reservationRoutes.js
externalRoutes.js
unsplashRoutes.js
health.js
services/
unsplashService.js
app.js
server.js
package.json
README.md
```
---

## 4) Setup & Installation (Local)

### 4.1 Install dependencies
```bash
npm install

4.2 Create .env file (local)

Create a .env file in the project root:

PORT=3000
MONGO_URI=YOUR_MONGODB_ATLAS_URI
JWT_SECRET=YOUR_LONG_SECRET
UNSPLASH_ACCESS_KEY=YOUR_UNSPLASH_KEY

4.3 Run locally

npm run dev

Server should start on:
	•	http://localhost:3000

Health check:
	•	http://localhost:3000/api/health

⸻

5) Deployment (Render)

Live URL: https://coffee-shop-tfdz.onrender.com/

Environment Variables on Render

In Render Dashboard → Service → Environment, set:
	•	MONGO_URI
	•	JWT_SECRET
	•	UNSPLASH_ACCESS_KEY (if you want Unsplash endpoint to work)

Render automatically provides PORT, the server uses:

const PORT = process.env.PORT || 3000;

Live Health Check

Open in browser:
	•	https://coffee-shop-tfdz.onrender.com/api/health

Expected response:

{ "status": "ok", "time": "..." }
```

⸻

6) API Documentation

Base URL
	•	Local: http://localhost:3000
	•	Production: https://coffee-shop-tfdz.onrender.com


⸻

7) Auth Routes (Public)

7.1 Register

POST /api/auth/register
```
{
  "name": "lily",
  "email": "lily@mail.com",
  "password": "123456"
}
```
Success:
	•	201 Created + { token, user }

7.2 Login

POST /api/auth/login

```
{
  "email": "lily@mail.com",
  "password": "123456"
}
```
Success:
	•	200 OK + { token, user }

⸻

8) User Routes (Private)

8.1 Get profile

GET /api/users/profile

Authorization: Bearer <token>

Success:
	•	200 OK + user profile

8.2 Update profile

PUT /api/users/profile

Authorization: Bearer <token>

{ "name": "lily updated" }

Success:
	•	200 OK

⸻

9) Resource Routes (Reservations) (Private)

All routes below require:

Authorization: Bearer <token>

9.1 Create reservation

POST /api/resource

Body (JSON):
```
{
  "title": "Table reservation",
  "dateTime": "2026-03-14T20:03:00.000Z",
  "guests": 2,
  "notes": "near window"
}
```
Success:
	•	201 Created + created resource

9.2 Get all my reservations

GET /api/resource

Success:
	•	200 OK + array of only the logged-in user resources

9.3 Get reservation by id

GET /api/resource/:id

Success:
	•	200 OK + resource
If not found / not yours:
	•	404 Not Found

9.4 Update reservation

PUT /api/resource/:id

Body example:

{ "notes": "updated note" }

Success:
	•	200 OK

9.5 Delete reservation

DELETE /api/resource/:id

Success:
	•	200 OK (or 204 depending on implementation)

⸻

10) External API Integration

10.1 Weather API (External)

GET /api/external/weather

10.2 Unsplash API (External)

GET /api/unsplash/random?query=coffee%20shop&count=12

Success:
	•	200 OK + list of photos

⸻

11) Validation & Error Handling (Examples)
```
11.1 400 Bad Request (missing fields)

Example: POST /api/auth/register with empty fields → 400

11.2 401 Unauthorized (no token)

Example: GET /api/resource without token → 401

11.3 403 Forbidden (ownership protection)

If User B tries to update/delete User A resource:
	•	403 Forbidden with message like Forbidden: not your resource

11.4 404 Not Found

Example: GET /api/resource/000000000000000000000000 → 404

11.5 409 Conflict

Register with existing email → 409

Global error handling middleware:
	•	src/middleware/errorHandler.js
```
⸻

12) Postman Evidence 

All screenshots are stored in the repository under postman/:
```
Auth
	•	postman/auth/POST register.png
	•	postman/auth/POST login.png

Profile
	•	postman/profile/GET profile.png
	•	postman/profile/PUT profile.png
	•	postman/profile/GET 401 profile.png

Resource
	•	postman/resource/POST resource.png
	•	postman/resource/GET resource.png
	•	postman/resource/GET resource id.png
	•	postman/resource/PUT resource id.png
	•	postman/resource/DELETE resource id.png

Error proofs
	•	postman/errors/400.png
	•	postman/errors/401.png
	•	postman/errors/403.png
	•	postman/errors/404.png
	•	postman/errors/409.png
```