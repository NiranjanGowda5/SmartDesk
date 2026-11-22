# SmartDesk portfolio and recruiter guide

## ATS résumé entry

**SmartDesk | IT Helpdesk and Ticket Management System**  
Java 21, Spring Boot, Spring Security, Spring Data JPA, Hibernate, MySQL, React, Vite, Axios, Maven

Developed a full-stack helpdesk application that connects employee requests, support engineer assignments, and administrator oversight through a shared ticket lifecycle.

- Built a Java REST backend and React client for reporting IT incidents, assigning support engineers, recording resolutions, and confirming closure.
- Implemented JWT authentication, BCrypt password hashing, employee-only public registration, and server-side checks for ticket ownership and assignment.
- Modeled tickets, users, categories, priorities, comments, and history with JPA entities and relational associations for MySQL.
- Developed role-specific ticket queues that let employees track their requests, engineers see assigned work, and administrators route issues across the desk.

## Two-minute project introduction

“SmartDesk is an IT helpdesk application built around a question that comes up whenever someone reports a problem at work. Who owns this issue now, and what still needs to happen before it can be closed?

“I’ll show you one ticket from three perspectives. An employee reports that their laptop loses its VPN connection after waking from sleep. They describe how to reproduce the problem and select its category and priority. The administrator can see that request in the wider queue and assign it to a support engineer. The engineer can then communicate with the employee, start work, and record the resolution. The employee checks that the connection works again and confirms closure.

“The frontend uses React, and the backend uses Java and Spring Boot. The important design decision was to keep authorization close to the data. Authentication establishes which account is making a request. The ticket operation then checks what that account may do with this particular record. For example, two engineers have the same role, but that alone does not give them access to each other's assigned work.

“On the database side, the requester and the assigned engineer are separate relationships. That matters because ownership of the original report stays stable even when the administrator changes the assignment. Comments capture conversation, while history helps explain what happened to the ticket. I’ll finish by showing the closed request and tracing one operation from the interface to the code that enforces its permissions.”

## Five-minute recruiter demonstration

Before presenting, follow the setup and demonstration-account instructions in the project README. Open three independent browser profiles or separate browser sessions and sign in with a different role in each. Check that each profile can load its queue. Use fictional information throughout the demonstration.

| Time | Account | Action and observable result |
| --- | --- | --- |
| 0:00–0:50 | Employee | Create **VPN disconnects after laptop resumes**. Describe the steps, select an available category and priority, and submit. Note the ticket number and show it in the employee queue. |
| 0:50–1:35 | Administrator | Locate that ticket and assign it to the engineer whose account is open. Explain the distinction between the original requester and the current assignee. |
| 1:35–2:50 | Support engineer | Refresh the assigned queue and open the ticket. Move it into progress, add a comment about reproduction, then resolve it with the note “Updated the VPN client and verified reconnect after sleep.” |
| 2:50–3:45 | Employee | Refresh the ticket. Point out the response and resolution, confirm closure, and inspect the recorded sequence. |
| 3:45–4:25 | Administrator | Find the closed ticket again. Explain how the administrator's queue differs from the engineer's queue. |
| 4:25–5:00 | Code | Open the ticket service and repository. Show how the backend identifies the caller, scopes ticket access, and persists the update. |

If the recruiter asks where the engineering challenge lies, open the repository methods for requester and engineer queues and the ticket update path. Discuss why role and row-level access are separate decisions. If asked about scale, explain which queries you would profile with representative data before changing the indexing or pagination strategy.

## Architecture explanation for a whiteboard

Draw five boxes in order: browser, security filter chain, controller, ticket service, and database. Place the repository between the service and database. Walk through an engineer opening an assigned ticket. The browser sends the bearer token along with the request. Spring Security authenticates the request, the controller binds the input, and the service checks the account's relationship to the ticket. The repository supplies the persisted record. The response gives the client the fields it needs to render the ticket.

For a follow-up, draw two separate arrows from the ticket to the account table, labeled **requester** and **assigned engineer**. Draw a one-to-many relationship from the ticket to comments and another to history. Ask what should happen if an engineer submits an update just after reassignment. Trace the decision using the latest stored assignment.
