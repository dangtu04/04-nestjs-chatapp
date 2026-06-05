# Authentication System

## 1. Technologies
- **Passport.js** + **JWT**: Token-based stateless auth
- **Bcrypt**: Password hashing (10 rounds)
- **Google OAuth 2.0**: Login via Google
- **NestJS Guards**: JwtAuthGuard (validates token), RolesGuard (checks role)
- **MongoDB/Mongoose**: User storage

## 2. Authentication Methods

### Local Login (Email + Password)
```
POST /auth/login → { email, password }
→ LocalStrategy.validate() → bcrypt.compare() 
→ AuthService.login() → JWT token { email, _id, role }
→ Response: { user, access_token }
```

### Google OAuth Login
```
POST /auth/login/google → { id_token }
→ verifyGoogleToken() → OAuth2Client.verifyIdToken() 
→ findOrCreateGoogleUser() 
→ AuthService.login() → JWT token
→ Response: { user, access_token }
```

### Logout
```
No server endpoint needed (JWT stateless)
Client: Remove token from localStorage/storage
```

## 3. Route Protection

**JwtAuthGuard** (default on all routes except @Public())
- Extracts token from "Authorization: Bearer <token>"
- Validates with JWT_SECRET
- Injects req.user: { _id, email, role }

**RolesGuard** (with @Roles() decorator)
- Checks user.role matches required role
- Returns 403 if role not authorized

## 4. API Endpoints

| Method | Endpoint | Public | Purpose |
|--------|----------|--------|---------|
| POST | `/auth/login` | ✓ | Local login |
| POST | `/auth/login/google` | ✓ | Google login |
| POST | `/auth/register` | ✓ | Register account |
| POST | `/auth/verify-account` | ✓ | Verify email |
| POST | `/auth/forgot-password` | ✓ | Request password reset |
| POST | `/auth/reset-password` | ✓ | Confirm password reset |

## 5. Environment Variables

```env
JWT_SECRET=your_secret_key
JWT_ACCESS_TOKEN_EXPIRED=1h
AUTH_GOOGLE_ID=xxx.apps.googleusercontent.com
```

## 6. Key Files

| File | Purpose |
|------|---------|
| `auth.controller.ts` | REST endpoints |
| `auth.service.ts` | Auth logic (login, verify Google) |
| `local.strategy.ts` | Passport strategy for email/password |
| `jwt.strategy.ts` | Passport strategy for JWT validation |
| `jwt-auth.guard.ts` | Guards all routes (checks JWT) |
| `roles.guard.ts` | Validates role-based access |

## 7. Error Codes

| Error | Status | Cause |
|-------|--------|-------|
| Invalid email or password | 401 | Wrong credentials |
| Tài khoản chưa được kích hoạt | 403 | Account inactive |
| Invalid access token | 401 | Token invalid/expired |
| Email chưa xác thực | 401 | Google email not verified |

## 8. Token Structure

```
JWT: Header.Payload.Signature
Payload: { email, _id, role, iat, exp }
Expires: 1 hour (configurable via JWT_ACCESS_TOKEN_EXPIRED)
Signed: HMAC-SHA256 with JWT_SECRET
```
