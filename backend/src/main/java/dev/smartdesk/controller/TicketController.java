package dev.smartdesk.controller;
import dev.smartdesk.service.*;
import dev.smartdesk.dto.Requests.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
@RestController @RequestMapping("/api/tickets")
public record TicketController(Accounts users,TicketService service) {
    @GetMapping public Object list(Principal p) { return service.list(users.current(p.getName())); }
    @PostMapping public Object create(Principal p,@Valid @RequestBody NewTicket r) { return service.create(users.current(p.getName()),r); }
    @GetMapping("/{id}") public Object detail(Principal p,@PathVariable long id) { return service.detail(users.current(p.getName()),id); }
    @PostMapping("/{id}/comments") public Object comment(Principal p,@PathVariable long id,@Valid @RequestBody Message r) { return service.comment(users.current(p.getName()),id,r.text()); }
    @PostMapping("/{id}/assign") public Object assign(Principal p,@PathVariable long id,@Valid @RequestBody Assignment r) { return service.assign(users.current(p.getName()),id,r.engineerId()); }
    @PostMapping("/{id}/status") public Object transition(Principal p,@PathVariable long id,@Valid @RequestBody Transition r) { return service.transition(users.current(p.getName()),id,r); }
}
