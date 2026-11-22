package dev.smartdesk.service;
import dev.smartdesk.entity.*;
import dev.smartdesk.enums.*;
import dev.smartdesk.dto.Requests.*;
import dev.smartdesk.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service
public class Administration {
    private final AccountRepository users;
    private final CategoryRepository categories;
    private final PriorityRepository priorities;
    private final TicketRepository tickets;
    public Administration(AccountRepository users, CategoryRepository categories, PriorityRepository priorities, TicketRepository tickets) {
        this.users = users;
        this.categories = categories;
        this.priorities = priorities;
        this.tickets = tickets;
    }
    public Object catalog() { return Map.of("categories",categories.findAll(),"priorities",priorities.findAll()); }
    @Transactional public Object saveItem(String kind,CatalogItem r) {
        if(kind.equals("categories")) {
            var item=r.id()==null?new Category():categories.findById(r.id()).orElseThrow(TicketService::missing);
            item.name=r.name().strip(); return categories.save(item);
        }
        if(kind.equals("priorities")) {
            var item=r.id()==null?new Priority():priorities.findById(r.id()).orElseThrow(TicketService::missing);
            item.name=r.name().strip(); return priorities.save(item);
        }
        throw TicketService.missing();
    }
    @Transactional public Account update(String email,long id,UserEdit r) {
        var u=users.lockById(id).orElseThrow(TicketService::missing);
        if(u.email.equals(email) && (!r.active() || r.role()!=Role.ADMIN))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Keep your own administrator access active");
        if(u.role==Role.ENGINEER && (!r.active() || r.role()!=Role.ENGINEER) && tickets.existsByEngineerIdAndStatusNot(id,Status.CLOSED))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Reassign outstanding tickets first");
        u.role=r.role(); u.active=r.active(); return u;
    }
    private static String cell(String value) {
        String safe=value.stripLeading();
        if(!safe.isEmpty() && "=+-@".indexOf(safe.charAt(0))>=0) value="'"+value;
        return "\""+value.replace("\"","\"\"")+"\"";
    }
    public String report() {
        var rows=new StringBuilder("ID,Title,Category,Priority,Status,Employee,Engineer,Created UTC\r\n");
        for(var t:tickets.findAllByOrderByIdDesc()) {
            var values=List.of(t.id.toString(),t.title,t.category.name,t.priority.name,t.status.name(),t.owner.name,t.engineer==null?"":t.engineer.name,t.createdAt.toString());
            rows.append(values.stream().map(Administration::cell).collect(java.util.stream.Collectors.joining(","))).append("\r\n");
        }
        return rows.toString();
    }
}
