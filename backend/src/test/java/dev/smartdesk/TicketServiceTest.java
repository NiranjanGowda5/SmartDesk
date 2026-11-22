package dev.smartdesk;
import dev.smartdesk.entity.Account;
import dev.smartdesk.enums.Role;
import dev.smartdesk.repository.*;
import dev.smartdesk.service.TicketService;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
class TicketServiceTest {
    @Test void engineerListUsesAssignedTicketQuery() {
        var repo=mock(TicketRepository.class);
        var service=new TicketService(repo,mock(AccountRepository.class),mock(CategoryRepository.class),mock(PriorityRepository.class),mock(CommentRepository.class),mock(HistoryRepository.class));
        var engineer=new Account(); engineer.role=Role.ENGINEER; engineer.id=44L;
        service.list(engineer);
        verify(repo).findByEngineerIdOrderByIdDesc(44L); verifyNoMoreInteractions(repo);
    }
}
