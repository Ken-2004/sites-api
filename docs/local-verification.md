# Local verification record

Results recorded on September 7, 2026 using Node.js **24.20.0** and npm
**11.19.0**. CI uses Node.js 24. Audit and coverage results describe this
verification run and should be checked again when dependencies or code change.

## Results

| Check | Result |
| --- | --- |
| Dependency installation | Passed with the generated lockfile |
| `npm test` | 4 suites, 54 tests passed |
| `npm run test:coverage` | 4 suites, 54 tests passed |
| `npm run test:smoke` | 1 suite, 4 tests passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| JavaScript syntax checks | All 13 source and test files passed |
| Startup configuration checks | Missing required variables and invalid ports fail before listening |
| `git diff --check` | Passed |

| Coverage metric | Result |
| --- | --- |
| Statements | 94.65% |
| Branches | 93.98% |
| Functions | 100% |
| Lines | 95.78% |

## Scope and limitations

Coverage measures `app.js`, `config.js`, and `middleware/**/*.js`. Database
services, schemas, and runtime startup are outside the Jest coverage scope.
Startup configuration was checked separately for missing variables and an
invalid port, including confirmation that error output does not expose the
signing secret.

Supertest exercises HTTP routing with mocked persistence. The smoke suite covers
health, registration, login, site CRUD, favourites, duplicate registration, and
missing resources. Regression tests cover absent and array request bodies,
independent application authentication, expired or invalid tokens, CORS
preflight, nested payload validation, and safe error responses.

These checks do not establish live MongoDB or deployed Vercel behavior. A
deployment still needs integration checks against its intended database.

Repository review found no private credentials or machine-specific filesystem
paths in the files prepared for commit. Credential checks used patterns and
manual review; they are not proof that every possible secret format is absent.
Example configuration and test credentials are placeholders. Generated coverage,
local environment files, dependencies, and deployment state are ignored.

## Reproduce

From the repository root with Node.js 24 installed:

```sh
npm ci
npm test
npm run test:coverage
npm run test:smoke
npm audit --omit=dev
git diff --check
```

The generated HTML report is available at `coverage/lcov-report/index.html`
after running coverage. Keep that directory out of version control; this record
is maintained separately in `docs/`.
