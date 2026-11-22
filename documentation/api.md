# SmartDesk HTTP API

Base URL `http://localhost:8080/api`. Send JSON and use the bearer token from login for protected requests. Sessions expire after one hour. Use the adjacent Postman collection in order with the local demo password to create, assign, resolve and close a new ticket.

| Method and path | Access | Input or result |
|---|---|---|
| POST /auth/register | Public | name, email, password (12+ characters, maximum 72 UTF-8 bytes). Returns token and employee user. |
| POST /auth/login | Public | email, password. Returns token and user. |
| GET /me | Signed in | Current account |
| GET /catalog | Signed in | categories and priorities arrays |
| POST /catalog/categories or /catalog/priorities | Admin | name, optional existing id to rename |
| GET /users | Admin | Accounts with id, name, email, role and active flag |
| PATCH /users/{id} | Admin | role (EMPLOYEE, ENGINEER, ADMIN), active (boolean) |
| GET /tickets | Signed in | Newest first within the caller's queue |
| POST /tickets | Employee | title, description, categoryId, priorityId |
| GET /tickets/{id} | Participant or admin | ticket, chronological comments and history |
| POST /tickets/{id}/assign | Admin | engineerId of an active engineer |
| POST /tickets/{id}/comments | Participant or admin | text, up to 4,000 characters |
| POST /tickets/{id}/status | Assigned engineer or owner | status, optional note. Resolution requires a note. |
| GET /reports/tickets.csv | Admin | UTF-8 CSV download |

Successful operations respond with HTTP 200. Validation errors return 400. Missing or expired credentials return 401. Role restrictions return 403. References outside the caller's queue return 404. Duplicate records and incompatible workflow changes return 409.

Engineers may start OPEN or PENDING tickets, pause IN_PROGRESS tickets, or resolve IN_PROGRESS tickets. The requesting employee may close a RESOLVED ticket. Administrators may reassign any ticket before closure.
