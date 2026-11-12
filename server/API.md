# PlacementX Backend V1 API

Base URL: `/api/v1`. Responses use `{ success, message, data }`; errors use `{ success: false, message, details? }`. Send `Authorization: Bearer <JWT>` for protected endpoints.

## Health and authentication

| Method | Endpoint | Auth | Body / notes |
| --- | --- | --- | --- |
| GET | `/health` | No | Service status |
| POST | `/auth/register` | No | `fullName`, `email`, `password` (8+ chars); returns user and JWT |
| POST | `/auth/login` | No | `email`, `password`; returns user and JWT |
| GET | `/auth/me` | Yes | Current user |
| POST | `/auth/logout` | Yes | Stateless acknowledgement; client discards JWT |

## Student endpoints

All endpoints below require a student JWT unless noted.

| Method | Endpoint | Body / query |
| --- | --- | --- |
| GET / PUT | `/profile` | PUT accepts safe profile fields only: name, image URL, education, target role/companies, skills, language, onboarding flag. Role/email/password are ignored. |
| GET | `/profile/completion` | Completion metadata |
| GET | `/dsa/questions` | `page`, `limit`, `topic`, `difficulty`, `company`, `solved=true|false`, `search` |
| GET | `/dsa/questions/:identifier` | Mongo id or slug; includes workspace problem content and explanation |
| POST | `/dsa/questions/:id/run` | `language`, `code`; sends public sample cases to a configured sandboxed judge only |
| POST | `/dsa/questions/:id/submit` | `language`, `code`; marks solved only when the configured judge returns a verified pass |
| PUT | `/dsa/questions/:id/progress` | Booleans: `attempted`, `bookmarked`, `revisionRequired`; `solved=true` is rejected unless verified by Submit |
| GET | `/dsa/progress` | Student progress summary and items |
| GET | `/aptitude/questions` | `page`, `limit`, `category`, `topic`, `difficulty`, `company`, `search`, `order=adaptive`; answers withheld |
| GET | `/aptitude/catalog` | Optional `category`, `difficulty`; actual topic and difficulty counts plus evidence-based recommendations |
| POST | `/aptitude/attempt` | `questionId`, `selectedAnswer` index; response evaluates the submitted attempt |
| PATCH | `/aptitude/attempt/:id/revision` | `{ revisionRequired: boolean }`; owner-only revision flag |
| GET | `/aptitude/progress` | Accuracy, category performance, weak topics |
| POST | `/aptitude/assessments` | Start or resume active timed assessment; `{ category?, difficulty?, questionCount: 1..30, durationMinutes: 5..90 }` |
| GET | `/aptitude/assessments/active` | Active assessment, or a just-expired assessment with results; `null` if none |
| GET | `/aptitude/assessments/:id` | Owner-only assessment; results only after submission |
| PATCH | `/aptitude/assessments/:id` | Save `{ questionIndex, selectedAnswer?: index or null, markedForReview?: boolean }` before server deadline |
| POST | `/aptitude/assessments/:id/submit` | Idempotent server-scored submission; returns score, topic performance and review |

Timed assessments persist their start and deadline on the server. Reads and saves finalize expired attempts. Pre-submission responses omit answer keys and explanations. Submitted answers are recorded once in the existing aptitude attempt collection, so the existing progress, readiness, intelligence, and planner calculations continue to use the same evidence. Demo seed questions are excluded from student question lists and new attempts; `npm run seed` no longer inserts them. Existing records are preserved.

The authored aptitude bank is maintained in `src/questionBank`. Run `npm run validate:aptitude` before the dedicated `npm run seed:aptitude` command. The seed is disabled when `NODE_ENV=production`, upserts by stable `bankId`, and deactivates only exact demo records without removing questions or attempts. `npm run audit:aptitude` reports active bank, demo, and historical attempt counts. Practice recommendations need at least three attempts before labeling a topic weak; other topics show as needing assessment. Average per-question solving time is omitted because the current attempt flow has no reliable server-side measurement for it.
| GET | `/companies` | Public; supports `page`, `limit`, `search` |
| GET | `/companies/:slug` | Public company profile |
| GET | `/companies/:slug/readiness` | Company-specific evidence-based readiness |
| POST | `/resumes/analyze` | Multipart field `resume`; PDF only, max 5 MB |
| GET | `/resumes` | Paginated own analysis history |
| GET / DELETE | `/resumes/:id` | Own analysis only |
| GET | `/resumes/:id/comparison` | Compares this persisted report with the previous own report; no re-analysis |
| POST | `/interviews` | Deterministic adaptive selection; `targetRole`, `interviewType` (`HR`, `Technical`, `Mixed`), optional `difficulty`, `targetCompany` |
| GET | `/interviews/history` | Paginated own interviews |
| GET | `/interviews/:id` | Own interview only |
| POST | `/interviews/:id/answers` | `answers: [{ questionId, text }]` |
| POST | `/interviews/:id/complete` | Deterministic evaluation, result persisted |
| GET | `/readiness` | Central weighted readiness calculation |
| GET | `/dashboard` | Aggregated dashboard data and recent activity |
| GET | `/planner/today` | Retrieves today’s persisted deterministic plan, generating it once if absent |
| POST | `/planner/generate` | Replaces today’s plan; optional `availableMinutes` (30–240) and valid `targetCompany` |
| PATCH | `/planner/tasks/:taskId` | `{ completed: boolean }`; updates planner-only completion, never DSA/aptitude evidence |
| GET | `/planner/week` | Derived weekly goals, completion, strongest area, and area needing attention |
| GET | `/planner/history` | Own persisted plan history; supports `page`, `limit` |
| GET | `/intelligence` | Deterministic, explainable, evidence-based cross-module readiness context; future AI Mentor input only |

## Admin endpoints

All require an authenticated `admin` user. Content resource is one of `dsa`, `aptitude`, `companies`, or `interview-questions`.

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET / POST | `/admin/:resource` | List/create shared content |
| PUT | `/admin/:resource/:id` | Validated model update |
| PATCH | `/admin/:resource/:id/deactivate` | Soft deactivate shared content |
| GET | `/admin/users` | Paginated, password-free user list |
| PATCH | `/admin/users/:id/deactivate` | Cannot self-deactivate |
| GET | `/admin/analytics` | Platform counts only |

Important errors: `400` invalid request/id/upload, `401` missing/invalid JWT, `403` role or inactive account, `404` missing/other-user resource, `409` duplicate email, `413` payload too large.

## Postman testing order

1. `GET /health`; register a student; login; save `token`.
2. `GET /auth/me`, then update and retrieve `/profile`.
3. Seed a development DB with `npm run seed`; add authored aptitude questions through admin content before practicing.
4. Update DSA progress; submit aptitude attempt; retrieve both progress endpoints.
5. List a company and retrieve its readiness.
6. Upload a valid PDF, retrieve the analysis, then verify another user cannot retrieve it.
7. Create interview, save answers, complete it, check history.
8. Retrieve `/readiness` and `/dashboard`.
9. Create an admin manually in the development database, verify admin endpoints succeed and the student receives `403`.
