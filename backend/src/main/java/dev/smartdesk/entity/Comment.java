package dev.smartdesk.entity;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import dev.smartdesk.enums.*;

@Entity
@Table(name="comments")
public class Comment {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @JsonIgnore @ManyToOne(optional=false) public Ticket ticket;
    @ManyToOne(optional=false) public Account actor;
    @Column(length=4000,nullable=false) public String text;
    public Instant createdAt = Instant.now();
}
