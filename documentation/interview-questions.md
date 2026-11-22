# SmartDesk interview workbook

Use the first fifty questions to rehearse the design, workflow, and trade-offs. The language, framework, and database rounds at the end focus on concepts an interviewer can explore while reviewing the source.

## Project questions and answers

### Problem and architecture

1. **What problem does SmartDesk solve?** It gives an employee one place to report an IT issue, see who is working on it, and confirm the outcome. The service desk can see which requests still need attention.
2. **What are the three user journeys?** An employee raises and tracks a request. A support engineer works an assigned request. An administrator routes requests and oversees the queue.
3. **Why split the client and server?** React owns interaction and presentation. Spring owns persistence and permission decisions. A second client can use the same HTTP API.
4. **How would you trace a button click through the application?** Start with the component's event handler, inspect the Axios request, match its HTTP method and path to a controller, then follow the service operation into the repository.
5. **What belongs in a controller?** The HTTP contract, including request binding, response representation, and status. Ticket workflow decisions belong together in the business layer so another entry point can reuse them.
6. **Why use DTOs at the API boundary?** They specify which fields a caller can submit or receive. For example, a registration request needs credentials while the caller has no reason to provide an account role.
7. **Why use a relational database for tickets?** Ownership, assignment, and activity are relationships with integrity requirements. A transaction can tie a ticket update to an activity record.
8. **What would you inspect if a ticket appears in MySQL but is missing on screen?** Identify the current account, inspect the list response, then check ownership, assignment, active filters, pagination, and frontend refresh behavior in that order.
9. **What makes a demo reproducible?** Known fictional accounts, documented setup, and a workflow that creates a new ticket each time. A recognizable subject lets the presenter find that ticket again.
10. **Which project outcomes can you defend on a résumé?** Demonstrable behaviors such as routing an issue between roles. A response-time improvement needs baseline and follow-up measurements before it becomes a defensible claim.

### Identity and access

11. **How do authentication and authorization differ here?** Authentication establishes the current account. Authorization determines whether that account may perform a particular action on a particular ticket.
12. **Why restrict public registration to employees?** A visitor controls every field sent from their browser. The registration service must choose the initial role itself.
13. **Why hash passwords with BCrypt?** A unique salt makes equal passwords produce different stored hashes. An adjustable work factor makes each password guess more expensive.
14. **How is a password checked at login?** Pass the supplied password and stored encoded value to the password encoder's matching function. Re-encoding and comparing strings fails because BCrypt generates a fresh salt.
15. **What does signing a JWT establish?** SmartDesk signs the subject, issuer, and timestamps with HS256. Verification establishes integrity and the trusted issuer. On each authenticated request the server looks up the active account and its current role, so account changes take effect on subsequent requests.
16. **Why set an expiry on access tokens?** SmartDesk issues one-hour tokens. Expiry limits how long a leaked token can be reused. The client needs to handle expiry and return the person to sign-in.
17. **Why enforce ticket ownership on the server?** A caller can construct an HTTP request without using the interface. The server must compare the authenticated account with the ticket's owner or assignee as appropriate.
18. **When should a protected API return 401?** When authentication is missing or invalid. A valid account that lacks permission ordinarily receives 403. Some APIs deliberately use 404 to conceal the presence of a protected resource.
19. **What should happen to access after reassignment?** The previous engineer's subsequent requests should be evaluated against the current assignee. A cached ticket on screen cannot grant write access.
20. **How would you test employee isolation?** Create two employees, create a ticket as the first, and request its details and updates as the second. Check the response and confirm that the stored ticket remains unchanged.

### Workflow and data

21. **Why separate the requester from the assignee?** They represent different responsibilities. The requester stays associated with the original report while assignment can change during triage.
22. **Why can assignment be empty?** A valid new request can exist before an administrator chooses an engineer. A nullable assignee models that gap explicitly.
23. **How do category and priority differ?** Category describes the kind of issue, such as network access. Priority describes the order in which it needs attention. They support different queue filters.
24. **Why keep a comment distinct from an activity entry?** Comments capture conversation. Activity records capture events such as assignment or a state change. The same ticket can contain both.
25. **What does a resolution note contribute?** It explains what restored service. For a printer issue, “reinstalled the signed driver and verified a test page” gives the requester a specific outcome to check.
26. **How do resolved and closed differ?** Resolved records completion of the engineer's work. Closed captures the end of the workflow after confirmation.
27. **What does pending mean operationally?** Work is waiting for information or another dependency. A comment can record who needs to respond and what information is missing.
28. **Why validate status transitions centrally?** Each mutation must satisfy both the actor's permissions and the current workflow state. Centralizing those checks keeps multiple screens from implementing incompatible rules.
29. **What data should an assignment event retain?** The actor, ticket, time, and sufficient assignment detail to explain what changed. Current assignment alone cannot answer how a ticket reached its present owner.
30. **What should happen if an activity insert fails during a state change?** Both writes should roll back together. Otherwise the current ticket and its history can describe different outcomes.
31. **How can a ticket update avoid racing a reassignment?** The ticket repository provides a pessimistic write-lock query. Inside a transaction, a writer can lock the ticket before checking its current assignee and applying a change. A competing writer waits for that transaction to release the row.
32. **How would you prevent an accidental duplicate ticket submission?** Disable the action while it is in flight. For safe retries after a network failure, add a server-side idempotency key tied to the requester.
33. **What does a foreign key protect?** It prevents references to missing rows. A ticket's requester must correspond to an existing user even if a programming mistake supplies a bad identifier.
34. **Why retain old category references?** Historical tickets should keep their classification. Retiring a referenced category preserves that relationship while preventing new selection.
35. **How would you choose an index for a queue?** Begin with the actual filters and ordering. For an engineer queue frequently sorted by creation time, evaluate a composite index beginning with assignee using real query plans.

### UI, reporting, and verification

36. **How should a queue behave when filters change?** Return to the first page of matching results. Keeping a late page after narrowing the filter can incorrectly suggest that the queue is empty.
37. **Why distinguish a loading state from an empty state?** Loading means the outcome is still unknown. An empty result means the request succeeded and the active filters matched zero records.
38. **How should a failed mutation appear to the user?** Preserve the user's input, display an actionable error, and refresh the record when the server reports stale state. Show success only after the server accepts the update.
39. **What should an engineer's performance count include?** Use tickets assigned to that engineer and clearly define the statuses counted. Current resolved workload and lifetime resolutions are different metrics.
40. **How do you keep dashboard figures understandable?** State the scope and time basis. A summary of currently assigned tickets answers a different question from the number of resolutions performed in a month.
41. **What makes CSV export tricky?** Commas, quotes, and embedded newlines require proper field quoting. For spreadsheets, untrusted text starting with a formula character also requires neutralization.
42. **Why use client-side and server-side validation?** Client validation gives immediate feedback. Server validation protects persisted data for every caller, including callers outside the browser.
43. **Which behavior benefits from a Mockito unit test?** A service refusing an invalid actor or state. A mock repository lets the test establish the precondition and verify that a rejected action caused no write.
44. **What does an integration test cover that a unit test misses?** It exercises connections between components, such as JSON binding, the security filter chain, controller routing, transactions, and the persisted result.
45. **Why include a negative permission test?** A successful administrator request cannot show that an employee is denied the same operation. The negative case verifies the boundary.
46. **How would you verify a frontend/backend contract?** Drive the normal UI, inspect the network request and response, then reload the page and confirm the persisted result with the relevant role.
47. **Why keep credentials in environment variables?** Deployments can supply different secrets without rebuilding or committing them. An example environment file should contain variable names and setup guidance.
48. **How would you diagnose a slow ticket list?** Measure request time, inspect SQL count and timing, look for repeated relationship queries, and compare the execution plan to the active indexes before changing code.
49. **What would you change for a larger deployment?** First measure queue volume and bottlenecks. Candidate changes include database-side aggregation, cursor pagination, centralized observability, and managed secret rotation.
50. **How would you demonstrate correctness in five minutes?** Follow one new ticket across all three roles, reload after each important update, and end by showing a role-boundary test and the recorded history.

## Core Java round

| Question | Answer |
| --- | --- |
| When is a record a good DTO? | When its shape is fixed and value-based equality is appropriate. Its fields are final, but a mutable object stored in a component can still change. |
| Why use an enum for a workflow state? | It expresses a closed set of states and permits type-checked comparisons and exhaustive switch expressions. |
| How do equals and hashCode work together? | Objects that compare equal must return equal hash codes. Changing a hash-relevant field after insertion can make a hash-map entry difficult to retrieve. |
| Where does Optional help? | A repository lookup can express that a record may be missing. The service can map absence to a domain error explicitly. |
| When is a List preferable to a Set? | A List represents an ordered sequence and allows repeated elements. A history timeline can have several similar entries. |
| What is an immutable object's concurrency benefit? | Readers can share it without coordinating mutations, provided its referenced state is also immutable or safely encapsulated. |
| Why inject dependencies through a constructor? | Required collaborators are explicit, can be final, and are straightforward to replace in a unit test. |
| When does a stream pipeline execute? | A terminal operation triggers traversal. Keep mapping and filtering functions free of external side effects where possible. |

## Spring Boot round

| Question | Answer |
| --- | --- |
| What does dependency injection provide? | The container constructs managed objects and supplies their dependencies. Application code can depend on an interface while the configuration selects the implementation. |
| What does a Spring Data JPA repository do? | It exposes persistence operations through a repository interface. Spring Data can derive queries from method names or use explicitly supplied queries. |
| Why use a service transaction? | The service can group several repository operations into a single business operation with a common commit or rollback boundary. |
| Why might a transactional annotation appear ineffective? | In common proxy-based configurations, a self-invocation bypasses the proxy. Transaction behavior also depends on which exceptions trigger rollback. |
| What does a security filter chain do? | It applies authentication and request authorization before controller dispatch. Object-specific access still needs the target object's context. |
| What is the N+1 query problem? | One list query triggers a further relationship query for each row. A suitable fetch plan, projection, or entity graph can reduce the repeated round trips. |
| What is the purpose of a controller advice? | It maps related exceptions to consistent HTTP responses across controllers and can avoid exposing implementation details. |
| Why distinguish a web-layer test from a full application test? | A web-layer test isolates routing, serialization, and validation. A full application test can exercise the wired services and persistence layer together. |

## SQL round

| Question | Answer |
| --- | --- |
| How do you count engineers with zero assigned tickets? | Start from engineers, left join matching tickets, and count the ticket primary key per engineer. Counting all rows would include the unmatched join row. |
| How do WHERE and HAVING differ? | WHERE filters source rows before grouping. HAVING filters groups after aggregation, such as groups with at least five open tickets. |
| Why store category names in a separate relation? | Each category has one identity and one editable label. Tickets can reference the category without copying that label into every row. |
| How do you keep pagination deterministic? | Add a unique tie-breaker such as the ticket identifier after the main sort key. Equal timestamps otherwise have no guaranteed relative order. |
| What can EXPLAIN tell you? | It describes the optimizer's planned access paths, selected indexes, and estimated work. Validate estimates with measured execution on representative data. |
| Why does an index have a write cost? | Each insert, delete, or indexed-column change must maintain additional index entries, consuming time and storage. |
| How do you filter an unassigned queue? | Test the assignee foreign key with IS NULL. Equality comparison to NULL produces an unknown result. |
| How do you avoid inflated counts when joining tickets and comments? | Aggregate at the intended grain first or count distinct ticket identifiers. A ticket joined to three comments appears in three joined rows. |
