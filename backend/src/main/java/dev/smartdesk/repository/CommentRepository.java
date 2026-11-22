package dev.smartdesk.repository;
import dev.smartdesk.entity.Comment;
import dev.smartdesk.enums.Status;
import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface CommentRepository extends JpaRepository<Comment,Long> {
    List<Comment> findByTicketIdOrderByIdAsc(Long id);
}
