package dev.smartdesk.repository;
import dev.smartdesk.entity.Priority;
import dev.smartdesk.enums.Status;
import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface PriorityRepository extends JpaRepository<Priority,Long> {
    
}
