package dev.smartdesk.repository;
import dev.smartdesk.entity.Ticket;
import dev.smartdesk.enums.Status;
import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface TicketRepository extends JpaRepository<Ticket,Long> {
    List<Ticket> findAllByOrderByIdDesc();
    List<Ticket> findByOwnerIdOrderByIdDesc(Long id);
    List<Ticket> findByEngineerIdOrderByIdDesc(Long id);
    boolean existsByEngineerIdAndStatusNot(Long id, Status status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Ticket t where t.id = :id")
    Optional<Ticket> lockById(@Param("id") Long id);
}
