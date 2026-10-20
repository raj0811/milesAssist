MilesAssist Backend
NestJS backend for MilesAssist. The repository structure indicates modules for users, admins, bookings, transactions, dashboard data, database access, and Redis integration.
> **Configuration and secrets:** Never commit `.env` or paste real database URLs, JWT secrets, Redis passwords, or access tokens into documentation. The screenshots shared with this project displayed sensitive values. Rotate any real credentials that were exposed, add `.env` to `.gitignore`, and configure production values in the deployment environment or a secrets manager.
Contents
Tech stack
Project structure
Requirements
Run locally with Node.js
Run with Docker
Environment variables
Authentication overview
How Redis is used
API reference
Troubleshooting
Tech stack
NestJS / TypeScript — API application and feature modules.
PostgreSQL — configured through `DATABASE_URL`; the supplied `.env` screenshot shows a Neon PostgreSQL connection.
Redis — a Redis module/service is present in `src/redis`.
Docker / Docker Compose — `Dockerfile` and `docker-compose.yml` are present.
Postman — the supplied collection contains example requests for admin, user, booking, transaction, and dashboard features.
Some implementation details (such as the exact Redis commands, token expiry, and role guard behavior) cannot be confirmed from the screenshots and Postman collection alone. See the source files listed below to verify those details.
Project structure
```text
milessassist/
├── src/
│   ├── admin/
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── admin.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   └── user.authGuard.ts
│   ├── bookings/
│   │   ├── bookings.controller.ts
│   │   ├── bookings.service.ts
│   │   └── bookings.module.ts
│   ├── dashboard/
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts
│   │   └── dashboard.module.ts
│   ├── database/
│   │   ├── schemas/
│   │   ├── database.module.ts
│   │   ├── database.service.ts
│   │   └── data-source.ts
│   ├── dto/
│   ├── migrations/
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   ├── transaction/
│   │   ├── transaction.controller.ts
│   │   ├── transaction.service.ts
│   │   └── transaction.module.ts
│   ├── user/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.module.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.build.json
└── .env                 # local secrets; do not commit
```
Main areas
Area	Responsibility indicated by the structure
`admin/`	Admin creation, login, and admin endpoints
`auth/`	Authentication module and a user authentication guard
`user/`	User creation, retrieval, and user-related operations
`bookings/`	Booking creation, lookup, updates, rescheduling, and cancellation
`transaction/`	Transaction creation, lookup, and status updates
`dashboard/`	Dashboard overview, revenue, alerts, recent transactions, and system health
`database/`	PostgreSQL/data-source setup, schemas/entities, and database service
`redis/`	Redis module and service
`dto/`	Request data-transfer objects and validation types, depending on implementation
`migrations/`	Database schema migrations
Requirements
Docker Desktop (recommended for containerized development).
Or Node.js compatible with the version specified in `package.json`.
A reachable PostgreSQL database.
A reachable Redis server if the application requires Redis during startup or while handling requests.
Run locally with Node.js
Install dependencies:
```bash
   npm ci
   ```
Create `.env` in the project root. Use the environment-variable names documented below and your own values. Do not copy secrets from screenshots or commit the file.
Build and start the application using scripts that actually exist in `package.json`:
```bash
   npm run build
   npm run start:prod
   ```
For development, inspect `package.json` and use its configured development script (commonly `npm run start:dev`).
The supplied Postman requests use `http://localhost:4000` as their base URL. The `.env` screenshot also shows `PORT=4000`; confirm `src/main.ts` reads `process.env.PORT` and that the process is listening on the same port.
Run with Docker
The repository contains both `Dockerfile` and `docker-compose.yml`. From the directory containing those files:
Ensure the `.env` file exists locally and contains valid configuration.
Review `docker-compose.yml` before starting: verify service names, port mappings, environment-variable references, and whether Redis is defined as a Compose service or is external.
Build and start the configured services:
```bash
   docker compose up --build -d
   ```
Check status:
```bash
   docker compose ps
   ```
Follow logs:
```bash
   docker compose logs -f
   ```
Or only the backend service, using the actual service name from `docker-compose.yml`:
```bash
   docker compose logs -f <backend-service-name>
   ```
Stop the services:
```bash
   docker compose down
   ```
Docker networking notes
Inside a container, `127.0.0.1` means that same container, not your host machine and not another Compose service.
If Redis is another service in the same Compose project, set `REDIS_HOST` to the Redis service name (often `redis`) and `REDIS_PORT` to the port exposed inside the Compose network, commonly `6379`.
If Redis is hosted externally, use its reachable hostname and credentials.
Do not publish Redis port `6379` to the public internet. In most setups, only the backend's HTTP port needs to be exposed.
The app's listening port, Docker `EXPOSE`/Compose `ports`, load balancer target port, and health-check configuration must agree. The exact values must be confirmed in `Dockerfile`, `docker-compose.yml`, and `src/main.ts`.
Environment variables
The screenshot of `.env` showed these variable names. Configure values appropriate to your environment:
Variable	Purpose
`DATABASE_URL`	PostgreSQL connection string
`PORT`	HTTP port the NestJS application listens on; screenshot showed `4000`
`JWT_SECRET`	Secret used to sign/verify JWTs, if this is how the app's auth code is implemented
`REDIS_HOST`	Redis hostname reachable from the app
`REDIS_PORT`	Redis port, commonly `6379`
`REDIS_PASSWORD`	Redis password, if authentication is enabled
The screenshot showed `DATABASE_URL` twice. Keep only one authoritative setting; duplicate environment-variable keys can cause confusing behavior depending on the loader. Do not include real values in this README.
For production, set environment variables in the deployment platform or use a secret manager. Do not bake `.env` into the Docker image.
Authentication overview
The Postman collection shows admin creation and login endpoints, plus user and booking/transaction requests that send a bearer token. The repository includes `src/auth/user.authGuard.ts`, indicating a guard is available.
Typical request flow (verify the exact implementation in the source):
A client calls the admin login endpoint with credentials.
The backend validates the credentials and, if valid, returns an access token.
The client sends the token on protected requests using:
```http
   Authorization: Bearer <access-token>
   ```
The authentication guard checks the request's token before allowing the request to reach the controller.
The controller calls the relevant service, which performs the business logic and database operations.
The collection contains token variables but does not contain actual login responses, expiry settings, password-hashing implementation, or guard source code. Therefore, token claims, expiry, refresh-token support, and role-based authorization must be confirmed from the implementation before relying on them.
Example login request
```http
POST /admin/login
Content-Type: application/json
```
```json
{
  "email": "admin@example.com",
  "password": "<your-password>"
}
```
Use the response token returned by your running API as the bearer token in Postman. The sample collection's credentials and tokens are examples only and should not be used in production.
How Redis is used
The project contains `src/redis/redis.module.ts` and `src/redis/redis.service.ts`, and the `.env` screenshot contains Redis connection settings. This confirms Redis integration is present, but the provided materials do not show which operations the service performs.
To understand the exact behavior, inspect `src/redis/redis.service.ts` and search for its methods/usages in the services. Redis is commonly used for caching frequently read data, short-lived values, counters, rate limits, or temporary state; do not assume this project uses any particular one until confirmed in the code.
Connection checklist:
Set `REDIS_HOST`, `REDIS_PORT`, and (if needed) `REDIS_PASSWORD` for the deployment environment.
Make sure the host is reachable from the backend container.
If Redis is a Compose service, use its service name rather than `127.0.0.1`.
Check backend logs for connection errors and confirm whether Redis is mandatory for startup or only for specific endpoints.
Keep Redis private and use authentication/TLS where required by the provider.
API reference
The following endpoint names and paths are derived from the supplied Postman collection. Several requests have empty URLs in the collection, so their paths are marked as not configured. Confirm controller decorators in the source before treating the table as a complete API specification.
Base URL used by configured examples: `http://localhost:4000`
Method	Path	Postman request
`GET`	Not configured in the supplied collection	Dashboard / overview
`GET`	Not configured in the supplied collection	Dashboard / revenue
`GET`	Not configured in the supplied collection	Dashboard / system alerts
`GET`	Not configured in the supplied collection	Dashboard / recent transaction
`GET`	Not configured in the supplied collection	Dashboard / system health
`GET`	Not configured in the supplied collection	Bookings / get bookings
`GET`	Not configured in the supplied collection	Bookings / booking stats
`GET`	`/bookings/2f32a440-c860-4ea9-9ecb-97190d706d47`	Bookings / get booking by id

`POST`	`/bookings/create`	Bookings / create bookings
`PATCH`	`/bookings/65e4bce9-0c07-4c2b-9a2d-d00395f1e50d`	Bookings / update booking
`PATCH`	`/bookings/65e4bce9-0c07-4c2b-9a2d-d00395f1e50d/reschedule`	Bookings / reschedule
`PATCH`	`/bookings/65e4bce9-0c07-4c2b-9a2d-d00395f1e50d/cancel`	Bookings / New Request
`POST`	`/admin/create`	Admin / create admin
`POST`	`/admin/login`	Admin / login
`GET`	Not configured in the supplied collection	Admin / get admin
`POST`	`/user/create`	Users / create User
`GET`	`/user/a57378b9-afa7-426f-a1ca-058ad2ec2120`	Users / get user by id
`GET`	`/user/fetch`	Users / get all User
`GET`	Not configured in the supplied collection	Users / update user
`GET`	Not configured in the supplied collection	Transaction / get all transactions
`GET`	Not configured in the supplied collection	Transaction / tranasction stats
`GET`	`/transactions/71d68046-d609-4755-9d3c-a34674ff24e4`	Transaction / get transaction by id
`POST`	`/transactions`	Transaction / create transaction
`PATCH`	`/transactions/901ec2b2-6e6e-48d5-95ea-1415bf966f9a/status`	Transaction / update transaction
API request notes
Requests that are protected in the collection include an `Authorization` bearer-token header or bearer auth configuration.
JSON requests should use `Content-Type: application/json`.
Replace the sample UUIDs, user IDs, and token variables with valid data from your own environment.
The Postman collection has no saved responses, so response shapes and status codes are not documented here.
Import `New Collection.postman_collection.json` into Postman to inspect the requests. Configure a Postman environment/base URL and token variables before sending requests.
Troubleshooting
API returns 502 behind a proxy or load balancer
Confirm the NestJS process starts without errors.
Confirm `main.ts` listens on `0.0.0.0` and the expected port.
Confirm the platform target port and health-check path match the running app.
Check application/container logs before opening additional public ports. A security-group rule by itself does not fix a process that is not listening.
PostgreSQL connection fails
Confirm `DATABASE_URL` is valid and reachable from the deployment network.
Check TLS/SSL requirements for the PostgreSQL provider.
Make sure only one `DATABASE_URL` setting is active.
Redis connection fails
Verify host, port, password, TLS requirements, and network reachability.
Do not use `127.0.0.1` for a Redis service in another container.
Docker build or startup fails
```bash
docker compose ps
docker compose logs --tail=200
```
Inspect the actual `Dockerfile`, `docker-compose.yml`, `package.json`, and startup logs before changing the container port or deployment settings.
Security checklist
[ ] `.env` is in `.gitignore`.
[ ] Any credentials shown in screenshots or shared publicly have been rotated.
[ ] Production secrets are configured in the deployment environment or a secrets manager.
[ ] Redis is not publicly exposed.
[ ] JWT secret is strong, unique, and not committed.
[ ] Postman sample passwords, IDs, and tokens are replaced with safe test values.

ER daigram 
https://dbdiagram.io/d/6aa77e41957fec6d5be57d9b