package dev.smartdesk.controller;
import dev.smartdesk.service.*;
import dev.smartdesk.dto.Requests.*;
import dev.smartdesk.repository.AccountRepository;
import java.security.Principal;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api")
public record AdminController(Administration service,AccountRepository users) {
    @GetMapping("/users") public Object usersList() { return users.findAll(); }
    @PatchMapping("/users/{id}") public Object edit(Principal p,@PathVariable long id,@Valid @RequestBody UserEdit r) { return service.update(p.getName(),id,r); }
    @GetMapping("/catalog") public Object catalog() { return service.catalog(); }
    @PostMapping("/catalog/{kind}") public Object save(@PathVariable String kind,@Valid @RequestBody CatalogItem r) { return service.saveItem(kind,r); }
    @GetMapping(value="/reports/tickets.csv",produces="text/csv") public ResponseEntity<String> report() {
        return ResponseEntity.ok().header("Content-Disposition","attachment; filename=smartdesk-tickets.csv").body(service.report());
    }
}
