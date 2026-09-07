# Sites API

A REST API for browsing and managing records about sites, with account-based
authentication and per-user favourites. Public routes support site discovery;
JSON Web Token (JWT) authentication protects site mutations and favourite
management.

## Features

- Register users and authenticate them with a username and password.
- Hash stored passwords with bcrypt.
- Issue bearer JWTs after successful login.
- Browse individual sites or a paginated, alphabetically sorted site list.
- Filter sites by name, description, year, town, or province/territory code.
- Create, update, and delete site records through authenticated routes.
- Add, list, and remove site IDs in an authenticated user's favourites.
- Return JSON responses and support cross-origin requests.
- Validate authentication, pagination, MongoDB ID, and site payload inputs.
- Return structured client-safe errors with meaningful HTTP status codes.
- Apply defensive HTTP headers and configurable CORS handling.
- Run database-independent API tests in GitHub Actions.

## Tech stack

- **Runtime:** Node.js with CommonJS modules
- **Web framework:** Express 5
- **Database:** MongoDB through Mongoose
- **Authentication:** Passport JWT and `jsonwebtoken`
- **Password hashing:** bcryptjs
- **Configuration:** dotenv for local environment variables
- **Testing:** Jest and Supertest
- **CI:** GitHub Actions on pushes and pull requests
- **Deployment configuration:** Vercel Functions

See [`package.json`](package.json) for the exact dependency versions.

## Architecture

The application is intentionally compact and split into three layers:

```text
HTTP request
    |
    v
server.js             Environment validation, service startup, HTTP listener
    |
    +--> app.js             Express routes, validation, security, responses
    |        |
    |        +--> middleware/validation.js
    |        +--> errors.js
    |
    +--> config.js          Required configuration and local port validation
    |
    +--> data-service.js    Site persistence and query construction
    |        |
    |        +--> modules/siteSchema.js
    |
    +--> user-service.js    Registration, login, and favourites persistence
             |
             +--> modules/userSchema.js
    |
    v
MongoDB
```

`app.js` exposes an application factory, so tests can configure Express without
opening a network listener or connecting to a production database. `server.js`
validates configuration, initializes both persistence services, exports the
configured application for serverless hosting, and only opens a local listener
after initialization outside Vercel. Site reads are public; Passport's JWT
middleware guards all site writes and favourite routes.
Each application factory call creates an independent Passport instance. Both
services reuse their initialization promises and allow a later connection attempt
after initialization fails.

## Setup

### Prerequisites

- Node.js 24 LTS (the version used in CI)
- npm
- A reachable MongoDB instance

### Local installation

1. Clone the repository and enter its directory.
2. Install the locked dependency versions:

   ```bash
   npm ci
   ```

3. Copy the environment template and replace its placeholder values:

   ```bash
   cp .env.example .env
   ```

   In PowerShell, use `Copy-Item .env.example .env`. Generate a signing secret
   with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`
   and store the result only in your local or hosting environment.

4. Start the API:

   ```bash
   npm start
   ```

5. Confirm it is available at `http://localhost:8080/` (or the configured
   `PORT`). A successful root request returns a small JSON health message.

Local startup waits for both database services before opening the HTTP listener.
If MongoDB cannot be reached, the process reports a generic initialization
failure without printing connection credentials.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URL` | Yes | MongoDB connection URI used by both persistence services. |
| `JWT_SECRET` | Yes | Secret used to sign and verify bearer JWTs. Use a long, random value. |
| `PORT` | No | Local listening port; defaults to `8080`. |
| `CORS_ORIGIN` | No | Allowed browser origin; defaults to `*` for local development. |
| `VERCEL` | Platform-managed | When present, prevents the module from starting its own listener. |

Never commit `.env` or production credentials. The tracked `.env.example`
contains documentation-only local placeholders.
Startup rejects missing or blank required variables and ports outside `1..65535`.
It does not verify secret strength or database reachability during configuration
validation; database connections are initialized separately.

## API endpoints

All request and response bodies are JSON unless noted. Protected endpoints
require this header:

```http
Authorization: Bearer <token>
```

Login tokens expire one hour after issuance. Validation and other client errors
use a consistent shape:

```json
{
  "error": {
    "message": "Human-readable message"
  }
}
```

Validation errors can additionally include a `details` array. Unexpected
database and implementation errors are not included in client responses.

### General

| Method | Path | Authentication | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Return an API health message. |

### Users and favourites

| Method | Path | Authentication | Description |
| --- | --- | --- | --- |
| `POST` | `/api/user/register` | Public | Register a user. The body expects `userName`, `password`, and matching `password2` fields. |
| `POST` | `/api/user/login` | Public | Authenticate with `userName` and `password`; returns a JWT. |
| `GET` | `/api/user/favourites` | Bearer JWT | Return the current user's favourite site IDs. |
| `PUT` | `/api/user/favourites/:id` | Bearer JWT | Add `id` to the current user's favourites without duplicates. |
| `DELETE` | `/api/user/favourites/:id` | Bearer JWT | Remove `id` from the current user's favourites. |

### Sites

| Method | Path | Authentication | Description |
| --- | --- | --- | --- |
| `GET` | `/api/sites` | Public | Return a paginated site list. |
| `GET` | `/api/sites/:id` | Public | Return one site by its MongoDB document ID. |
| `POST` | `/api/sites` | Bearer JWT | Create a site from the JSON request body. |
| `PUT` | `/api/sites/:id` | Bearer JWT | Update the supplied fields on a site. |
| `DELETE` | `/api/sites/:id` | Bearer JWT | Delete a site and return an empty `204` response. |

`GET /api/sites` requires numeric `page` and `perPage` query parameters. It
also accepts the optional filters below; text searches for `name`,
`description`, and `town` are case-insensitive.

| Query parameter | Matches |
| --- | --- |
| `name` | `siteName` |
| `description` | `description` |
| `year` | An entry in `dates.year` |
| `town` | `location.town` |
| `provinceOrTerritoryCode` | `provinceOrTerritory.code` |

Example:

```bash
curl "http://localhost:8080/api/sites?page=1&perPage=10&town=Halifax"
```

The site schema supports a name, description, designation year, image URL,
dated events, location details, and province or territory metadata. Consult
[`modules/siteSchema.js`](modules/siteSchema.js) for the exact document shape.

### Validation and status codes

- Request bodies for registration, login, and site writes must be JSON objects.
- Usernames are trimmed and must be nonempty. Registration requires a password
  of at least eight characters and an identical `password2`. Login requires a
  nonempty username and password.
- `page` and `perPage` must be positive integers; `perPage` is capped at 100.
- Site and favourite path IDs must be 24-character hexadecimal MongoDB ObjectIds.
- Site string fields include `siteName`, `description`, and `image`; `designated`
  and location coordinates are numbers. `dates` is an array of objects with string
  `year` and `type` fields. Location and province/territory details must be objects
  with the field types defined in the schema. Fields remain optional for partial
  updates and compatibility with existing records.
- Invalid input or malformed JSON returns `400`; invalid credentials or missing,
  invalid, or expired bearer tokens return `401`. Missing resources return `404`,
  duplicate usernames return `409`, and unexpected failures return a generic `500`.
- Registration and site creation return `201`; site deletion returns `204`.

## Security

Passwords are hashed with bcrypt at cost 10 and excluded from default user
queries. Login returns the same error for an unknown username and an incorrect
password. JWTs expire after one hour. Site updates run Mongoose validators, and
favourites use MongoDB's `$addToSet` to avoid duplicate IDs.

The application disables `X-Powered-By` and sets content-type, framing, content
security policy, referrer, cross-origin isolation, and strict transport security
headers. Use HTTPS at the hosting layer. Set `CORS_ORIGIN` to your frontend's
exact origin in production; the default `*` is permissive. CORS controls browser
access and is not an authorization mechanism. Unexpected errors are masked in
HTTP responses, and startup connection failures use a generic log message.

## Deployment

The included `vercel.json` sends all paths to the exported Express application
in `server.js` using Vercel's Node.js runtime.

To deploy on Vercel:

1. Import the repository into a Vercel project or deploy it with the Vercel CLI.
2. Configure `MONGO_URL` and `JWT_SECRET` in the project's environment-variable
   settings. Do not place production values in `vercel.json` or commit them.
   Select Node.js 24 and configure `CORS_ORIGIN` for the deployed frontend.
3. Deploy and verify `/`, user registration/login, a public site query, and an
   authenticated route against the intended MongoDB database.

The same exported Express application can be adapted to another Node.js host;
on a conventional server, run `node server.js` and supply the environment
variables through the hosting platform.

## Testing and continuous integration

The Jest/Supertest suite mocks persistence services, so it does not need MongoDB
or production credentials. It covers health and 404 responses, request
validation, successful and unsuccessful login behavior, JWT expiry, public site
reads, missing resources, and authentication on protected routes.

```bash
npm test
npm run test:coverage
npm run test:smoke
npm audit --omit=dev
```

The smoke suite exercises health, registration/login, site CRUD, and favourites
through Supertest HTTP requests with mocked persistence. Regression tests also
cover absent/array bodies, independent app authentication, invalid and expired
tokens, CORS preflight, nested site validation, and safe error responses.
Coverage measures `app.js`, `config.js`, and `middleware/**/*.js`; it does not
measure the database services or runtime startup. These tests do not establish
live MongoDB or deployed Vercel behavior.

See the [local verification record](docs/local-verification.md) for recorded
results, reproduction commands, and verification scope.

`.github/workflows/ci.yml` uses Node.js 24 LTS to run `npm ci` and `npm test` on
every push and pull request. The workflow grants read-only repository-content
access and does not define database credentials.

## Skills demonstrated

- Designing RESTful routes and consistent JSON responses with Express
- Separating HTTP concerns from MongoDB persistence services
- Modeling nested MongoDB documents with Mongoose schemas
- Implementing password hashing, JWT issuance, and protected routes
- Building pagination and composable database filters
- Validating external input and designing safe, structured API errors
- Testing Express endpoints without external infrastructure
- Managing secrets through environment-based configuration
- Configuring a Node.js API for serverless deployment
- Automating dependency installation and tests with GitHub Actions

## Current project boundaries

- Role-based authorization is not present; authenticated users share the same
  site-management permissions.
- Validation checks important field types but does not enforce a complete site
  record because existing site fields are intentionally optional.
- The API expects an existing MongoDB database; it does not include seed data or
  database migrations.
- Rate limiting, password recovery, refresh tokens, token revocation, and
  brute-force protection are not implemented.
- Text filters use MongoDB regular expressions. Query length, regex complexity,
  and search performance need additional controls for public production traffic.
- Favourites store IDs without checking that the referenced site exists; deleting
  a site does not remove its ID from users' favourites.
- The root endpoint reports application liveness, not database readiness. Database
  integration tests and graceful database shutdown are future work.
