package dev.smartdesk.controller;
import dev.smartdesk.service.Accounts;
import dev.smartdesk.dto.Requests.*;
import dev.smartdesk.enums.Role;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api")
public record AuthController(Accounts accounts) {
    @PostMapping("/auth/register") public Object register(@Valid @RequestBody Registration r) { return accounts.session(accounts.create(r.name(),r.email(),r.password(),Role.EMPLOYEE)); }
    @PostMapping("/auth/login") public Object login(@Valid @RequestBody Login r) { return accounts.session(accounts.login(r)); }
    @GetMapping("/me") public Object me(Principal p) { return accounts.current(p.getName()); }
}
