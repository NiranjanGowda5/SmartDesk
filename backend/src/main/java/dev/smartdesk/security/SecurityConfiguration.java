package dev.smartdesk.security;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import dev.smartdesk.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
@Configuration
public class SecurityConfiguration {
    @Bean BCryptPasswordEncoder passwords() { return new BCryptPasswordEncoder(); }
    @Bean SecretKeySpec key(@Value("${smartdesk.secret}") String encoded) {
        byte[] bytes = Base64.getDecoder().decode(encoded);
        if(bytes.length < 32) throw new IllegalArgumentException("JWT_SECRET requires at least 32 random bytes");
        return new SecretKeySpec(bytes,"HmacSHA256");
    }
    @Bean JwtEncoder encoder(SecretKeySpec key) { return new NimbusJwtEncoder(new ImmutableSecret<>(key)); }
    @Bean JwtDecoder decoder(SecretKeySpec key) {
        var decoder = NimbusJwtDecoder.withSecretKey(key).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("smartdesk"));
        return decoder;
    }
    @Bean SecurityFilterChain security(HttpSecurity http, AccountRepository users) throws Exception {
        return http.csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a.requestMatchers("/api/auth/login","/api/auth/register","/error").permitAll()
                .requestMatchers("/api/users/**","/api/reports/**").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST,"/api/catalog/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwt -> {
                var user = users.findByEmail(jwt.getSubject()).filter(u -> u.active)
                    .orElseThrow(() -> new BadCredentialsException("Inactive account"));
                return new JwtAuthenticationToken(jwt, java.util.List.of(new SimpleGrantedAuthority("ROLE_"+user.role)),user.email);
            }))).build();
    }
}
