package dev.smartdesk.service;
import dev.smartdesk.entity.Account;
import dev.smartdesk.enums.Role;
import dev.smartdesk.repository.AccountRepository;
import dev.smartdesk.dto.Requests.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
@Service
public record Accounts(AccountRepository users, BCryptPasswordEncoder passwords, JwtEncoder encoder) {
    public Account create(String name,String email,String password,Role role) {
        if(password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Password exceeds 72 UTF-8 bytes");
        var user=new Account(); user.name=name.strip(); user.email=email.strip().toLowerCase(Locale.ROOT);
        user.passwordHash=passwords.encode(password); user.role=role;
        return users.saveAndFlush(user);
    }
    public Account current(String email) { return users.findByEmail(email).orElseThrow(); }
    public Account login(Login form) {
        return users.findByEmail(form.email().strip().toLowerCase(Locale.ROOT))
            .filter(u -> u.active && passwords.matches(form.password(),u.passwordHash))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid credentials"));
    }
    public Map<String,Object> session(Account user) {
        var now=Instant.now();
        var claims=JwtClaimsSet.builder().issuer("smartdesk").subject(user.email).issuedAt(now).expiresAt(now.plusSeconds(3600)).build();
        var header=JwsHeader.with(MacAlgorithm.HS256).build();
        return Map.of("user",user,"token",encoder.encode(JwtEncoderParameters.from(header,claims)).getTokenValue());
    }
}
