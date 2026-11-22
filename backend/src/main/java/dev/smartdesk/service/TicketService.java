package dev.smartdesk.service;
import dev.smartdesk.entity.*;
import dev.smartdesk.enums.*;
import dev.smartdesk.repository.*;
import dev.smartdesk.dto.Requests.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@Service @Transactional
public class TicketService {
    private final TicketRepository tickets;
    private final AccountRepository users;
    private final CategoryRepository categories;
    private final PriorityRepository priorities;
    private final CommentRepository comments;
    private final HistoryRepository history;
    public TicketService(TicketRepository tickets, AccountRepository users, CategoryRepository categories, PriorityRepository priorities, CommentRepository comments, HistoryRepository history) {
        this.tickets = tickets;
        this.users = users;
        this.categories = categories;
        this.priorities = priorities;
        this.comments = comments;
        this.history = history;
    }
    static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Record unavailable"); }
    static void require(boolean condition) { if(!condition) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Action unavailable for this account"); }
    public List<Ticket> list(Account a) {
        return switch(a.role) {
            case ADMIN -> tickets.findAllByOrderByIdDesc();
            case EMPLOYEE -> tickets.findByOwnerIdOrderByIdDesc(a.id);
            case ENGINEER -> tickets.findByEngineerIdOrderByIdDesc(a.id);
        };
    }
    private Ticket visible(Account a, Optional<Ticket> row) {
        return row.filter(t -> switch(a.role) {
            case ADMIN -> true;
            case EMPLOYEE -> t.owner.id.equals(a.id);
            case ENGINEER -> t.engineer!=null && t.engineer.id.equals(a.id);
        }).orElseThrow(TicketService::missing);
    }
    private void log(Ticket ticket,Account actor,String text) {
        var event=new History(); event.ticket=ticket; event.actor=actor; event.text=text; history.save(event);
    }
    public Map<String,Object> detail(Account a,long id) {
        var t=visible(a,tickets.findById(id));
        return Map.of("ticket",t,"comments",comments.findByTicketIdOrderByIdAsc(id),"history",history.findByTicketIdOrderByIdAsc(id));
    }
    public Ticket create(Account a,NewTicket r) {
        require(a.role==Role.EMPLOYEE);
        var t=new Ticket(); t.owner=a; t.title=r.title().strip(); t.description=r.description().strip();
        t.category=categories.findById(r.categoryId()).orElseThrow(TicketService::missing);
        t.priority=priorities.findById(r.priorityId()).orElseThrow(TicketService::missing);
        tickets.save(t); log(t,a,"Ticket opened"); return t;
    }
    public Ticket assign(Account a,long id,long engineerId) {
        require(a.role==Role.ADMIN);
        var engineer=users.lockById(engineerId).filter(u -> u.active && u.role==Role.ENGINEER).orElseThrow(TicketService::missing);
        var t=visible(a,tickets.lockById(id));
        if(t.status==Status.CLOSED) throw new ResponseStatusException(HttpStatus.CONFLICT,"Closed tickets cannot be reassigned");
        t.engineer=engineer; log(t,a,"Assigned to "+engineer.name); return t;
    }
    public Ticket transition(Account a,long id,Transition change) {
        var t=visible(a,tickets.lockById(id));
        var next=change.status();
        boolean confirm=a.role==Role.EMPLOYEE && t.status==Status.RESOLVED && next==Status.CLOSED;
        if(!confirm) {
            require(a.role==Role.ENGINEER);
            boolean allowed=switch(t.status) {
                case OPEN, PENDING -> next==Status.IN_PROGRESS;
                case IN_PROGRESS -> next==Status.PENDING || next==Status.RESOLVED;
                default -> false;
            };
            if(!allowed) throw new ResponseStatusException(HttpStatus.CONFLICT,"Invalid status transition");
        }
        String note=Objects.toString(change.note(),"").strip();
        if(next==Status.RESOLVED && note.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Enter a resolution note");
        log(t,a,t.status+" → "+next+(note.isEmpty()?"":" · "+note)); t.status=next; return t;
    }
    public Comment comment(Account a,long id,String text) {
        var t=visible(a,tickets.lockById(id));
        var c=new Comment(); c.ticket=t; c.actor=a; c.text=text.strip(); return comments.save(c);
    }
}
