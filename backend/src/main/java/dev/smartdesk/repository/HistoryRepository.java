package dev.smartdesk.repository;
import dev.smartdesk.entity.History;
import dev.smartdesk.enums.Status;
import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface HistoryRepository extends JpaRepository<History,Long> {
    List<History> findByTicketIdOrderByIdAsc(Long id);
}
