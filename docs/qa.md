# Portfolio verification

Testing used a loopback MySQL instance, the Spring Boot API, and the React frontend in Microsoft Edge. Backend integration tests use a separate H2 database. Browser workflow runs create a fictional ticket in the demo database.

| Requirement | Evidence |
| --- | --- |
| Authentication and permissions | MockMvc tests cover employee-only registration, invalid credentials, unauthenticated requests, denied directory access, account deactivation and current roles on existing tokens. Browser tests sign in separately for all three roles. |
| Employee workflow | A browser test opens a ticket with category and priority, reads the conversation, and confirms resolution. Tests check ticket ownership, employee comments and chronological history. |
| Support engineer workflow | Tests cover assigned-ticket scope, starting work, pausing, resuming, comments, required resolution notes and loss of access after reassignment. Dashboard statistics reflect the engineer's assigned queue. |
| Administrator workflow | Tests cover assignment, reassignment, directory updates, catalog changes, queue access and CSV download. |
| UI | Browser checks cover registration and login views, all three overviews, the queue and detail views, the creation form, and administration. Checks exercise search, status filtering, empty results, confirmation, mobile navigation and dark mode. A 13-row browser fixture exercises both pagination controls. |
| Analytics | The overview displays workload counts, ticket status and category distribution. The analytics screenshot shows the chart section of the administrator overview. |
| Database and setup | Flyway migrations define MySQL relations and indexes. The previous startup applied the migration. Final QA used the running services and existing data. PowerShell scripts cover prerequisites, dependency installation, database setup and launch. |
| Portfolio | README gallery and vector banner, architecture and ER diagram, API reference, Postman collection, recruiter walkthrough, résumé bullets and interview workbook. |

## Security review

Reviewed the security filter chain, account and ticket services, administrator routes, serialized account fields, CSV output, environment loading and Git exclusions. Authorization uses the current account state and service-side ticket scope. BCrypt hashes passwords, JWTs expire after one hour, and the signing key must decode to at least 32 bytes. The role and ownership tests exercise these boundaries. The local demo shares a password across its fictional accounts. Live credentials, local data, logs and build caches are excluded from the public repository.

The browser keeps the bearer token in session storage. Signing out clears that browser session. A previously issued token can remain valid until expiry while the account is active. The portfolio setup binds to loopback and uses local HTTP. Public deployment would require a separate deployment and security review.

## Java and Spring support

Maven targets Java 21. This machine built and tested the project with JDK 22.0.1. Spring Boot 3.5.16 supports Java 17 through 25, including both versions. The project preserves the requested Spring Boot 3.x stack. Public maintenance of the 3.5.x line ended with 3.5.16, and later vendor support requires commercial coverage. [System requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html) · [Spring release announcement](https://spring.io/blog/2026/06/25/spring-boot-3-5-16-available-now/)
