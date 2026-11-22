package dev.smartdesk.config;
import dev.smartdesk.dto.Requests.*;
import dev.smartdesk.entity.*;
import dev.smartdesk.enums.*;
import dev.smartdesk.repository.*;
import dev.smartdesk.service.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Component
public class Seed implements ApplicationRunner {
    private final Accounts accounts;
    private final AccountRepository users;
    private final CategoryRepository categories;
    private final PriorityRepository priorities;
    private final TicketService tickets;
    public Seed(Accounts accounts, AccountRepository users, CategoryRepository categories, PriorityRepository priorities, TicketService tickets) {
        this.accounts = accounts;
        this.users = users;
        this.categories = categories;
        this.priorities = priorities;
        this.tickets = tickets;
    }
    @Value("${smartdesk.demo-password:}") private String password;
    @Transactional public void run(ApplicationArguments args) {
        if(categories.count()==0) for(String name:List.of("Hardware","Software","Network","Access")) {
            var c=new Category(); c.name=name; categories.save(c);
        }
        if(priorities.count()==0) for(String name:List.of("Low","Medium","High","Urgent")) {
            var p=new Priority(); p.name=name; priorities.save(p);
        }
        if(password.isBlank() || users.count()!=0) return;
        if(password.length()<12) throw new IllegalArgumentException("DEMO_PASSWORD requires 12 or more characters");
        var owner=accounts.create("Maya Rao","employee@smartdesk.test",password,Role.EMPLOYEE);
        var engineer=accounts.create("Leo Bennett","engineer@smartdesk.test",password,Role.ENGINEER);
        var admin=accounts.create("Asha Patel","admin@smartdesk.test",password,Role.ADMIN);
        var cs=categories.findAll(); var ps=priorities.findAll();
        String[][] samples={{"Docking station drops second display","The external display disconnects after the laptop wakes from sleep."},{"Design tool update stalled","The desktop client stops during its scheduled update."},{"VPN disconnects during calls","Remote sessions disconnect on the office VPN during video calls."},{"Finance workspace access","Please enable read access for quarterly reconciliation."},{"Headset microphone muted","The USB headset is detected but the input level stays at zero."},{"Calendar sync delayed","New meeting invitations reach the desktop calendar an hour late."}};
        for(int i=0;i<samples.length;i++) {
            var t=tickets.create(owner,new NewTicket(samples[i][0],samples[i][1],cs.get(i%cs.size()).id,ps.get(i%ps.size()).id));
            if(i==0) continue;
            tickets.assign(admin,t.id,engineer.id);
            tickets.transition(engineer,t.id,new Transition(Status.IN_PROGRESS,null));
            if(i==2) tickets.transition(engineer,t.id,new Transition(Status.PENDING,"Waiting for connection logs."));
            if(i>=3) tickets.transition(engineer,t.id,new Transition(Status.RESOLVED,"Configuration updated and verified with the requester."));
            if(i==5) tickets.transition(owner,t.id,new Transition(Status.CLOSED,"Calendar invitations now arrive on time."));
        }
    }
}
