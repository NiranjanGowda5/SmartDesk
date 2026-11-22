package dev.smartdesk;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;
import org.springframework.http.HttpMethod;
import java.util.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("demo")
class WorkflowTest {
    static final String password=UUID.randomUUID().toString();
    @DynamicPropertySource static void settings(DynamicPropertyRegistry r) {
        r.add("smartdesk.demo-password",()->password);
        r.add("smartdesk.secret",()->Base64.getEncoder().encodeToString(UUID.randomUUID().toString().getBytes()));
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    JsonNode call(String method,String url,String token,Object body,int expected) throws Exception {
        var req=request(HttpMethod.valueOf(method),"/api"+url);
        if(token!=null) req.header("Authorization","Bearer "+token);
        if(body!=null) req.contentType("application/json").content(json.writeValueAsBytes(body));
        var result=mvc.perform(req).andExpect(status().is(expected)).andReturn();
        return json.readTree(result.getResponse().getContentAsByteArray());
    }
    JsonNode login(String role) throws Exception {
        return call("POST","/auth/login",null,Map.of("email",role+"@smartdesk.test","password",password),200);
    }
    @Test void registrationAndAuthentication() throws Exception {
        call("GET","/tickets",null,null,401);
        call("POST","/auth/login",null,Map.of("email","admin@smartdesk.test","password","incorrect"),401);
        call("POST","/auth/register",null,Map.of("name","Other","email","fail@example.test","password",password,"role","ADMIN"),400);
        var session=call("POST","/auth/register",null,Map.of("name","Taylor","email","taylor@example.test","password",password),200);
        assertEquals("EMPLOYEE",session.at("/user/role").asText());
        assertFalse(session.get("user").has("passwordHash"));
        call("GET","/users",session.get("token").asText(),null,403);
    }
    @Test void administratorChangesApplyToExistingSessions() throws Exception {
        String admin=login("admin").get("token").asText();
        var account=call("POST","/auth/register",null,Map.of("name","Chris","email","chris@example.test","password",password),200);
        String token=account.get("token").asText();
        String path="/users/"+account.at("/user/id").asLong();
        call("POST","/catalog/categories",token,Map.of("name","Equipment"),403);
        var item=call("POST","/catalog/categories",admin,Map.of("name","Equipment"),200);
        var renamed=call("POST","/catalog/categories",admin,Map.of("name","Loan equipment","id",item.get("id").asLong()),200);
        assertEquals("Loan equipment",renamed.get("name").asText());
        call("PATCH",path,admin,Map.of("role","ENGINEER","active",true),200);
        assertEquals("ENGINEER",call("GET","/me",token,null,200).get("role").asText());
        call("PATCH",path,admin,Map.of("role","ENGINEER","active",false),200);
        call("GET","/me",token,null,401);
    }
    @Test void reassignmentTransfersAccessAndPreservesPendingWork() throws Exception {
        String admin=login("admin").get("token").asText();
        String employee=login("employee").get("token").asText();
        var first=login("engineer");
        String previous=first.get("token").asText();
        var next=call("POST","/auth/register",null,Map.of("name","Robin","email","robin@example.test","password",password),200);
        long nextId=next.at("/user/id").asLong();
        String successor=next.get("token").asText();
        call("PATCH","/users/"+nextId,admin,Map.of("role","ENGINEER","active",true),200);
        var priority=call("POST","/catalog/priorities",admin,Map.of("name","Service interruption"),200);
        long category=call("GET","/catalog",employee,null,200).at("/categories/0/id").asLong();
        var ticket=call("POST","/tickets",employee,Map.of("title","Printer offline","description","Printer unreachable","categoryId",category,"priorityId",priority.get("id").asLong()),200);
        String path="/tickets/"+ticket.get("id").asLong();
        call("POST",path+"/assign",admin,Map.of("engineerId",first.at("/user/id").asLong()),200);
        call("POST",path+"/status",previous,Map.of("status","IN_PROGRESS"),200);
        call("POST",path+"/status",previous,Map.of("status","PENDING"),200);
        call("POST",path+"/assign",admin,Map.of("engineerId",nextId),200);
        call("GET",path,previous,null,404);
        call("POST",path+"/status",previous,Map.of("status","IN_PROGRESS"),404);
        call("POST",path+"/status",successor,Map.of("status","IN_PROGRESS"),200);
        call("POST",path+"/comments",employee,Map.of("text","Printer is back online"),200);
    }
    @Test void completeThreeRoleLifecycle() throws Exception {
        String employee=login("employee").get("token").asText(),admin=login("admin").get("token").asText();
        var engineerSession=login("engineer"); String engineer=engineerSession.get("token").asText();
        var other=call("POST","/auth/register",null,Map.of("name","Sam","email","sam@example.test","password",password),200).get("token").asText();
        var cat=call("GET","/catalog",employee,null,200);
        var form=Map.of("title","VPN issue","description","Office VPN disconnects","categoryId",cat.at("/categories/0/id").asLong(),"priorityId",cat.at("/priorities/0/id").asLong());
        String path="/tickets/"+call("POST","/tickets",employee,form,200).get("id").asLong();
        call("GET",path,other,null,404);
        call("POST",path+"/comments",other,Map.of("text","Hi"),404);
        call("GET",path,engineer,null,404);
        var assignment=Map.of("engineerId",engineerSession.at("/user/id").asLong());
        call("POST",path+"/assign",employee,assignment,403);
        call("POST",path+"/assign",admin,assignment,200);
        call("POST",path+"/status",engineer,Map.of("status","RESOLVED","note","done"),409);
        call("POST",path+"/status",engineer,Map.of("status","IN_PROGRESS"),200);
        call("POST",path+"/comments",engineer,Map.of("text","Checking profile"),200);
        call("POST",path+"/status",engineer,Map.of("status","RESOLVED"),400);
        call("POST",path+"/status",engineer,Map.of("status","RESOLVED","note","Renewed VPN profile"),200);
        call("POST",path+"/status",employee,Map.of("status","CLOSED"),200);
        var detail=call("GET",path,employee,null,200);
        assertEquals("CLOSED",detail.at("/ticket/status").asText());
        assertEquals(5,detail.get("history").size());
        assertEquals(1,detail.get("comments").size());
        mvc.perform(get("/api/reports/tickets.csv").header("Authorization","Bearer "+admin)).andExpect(status().isOk()).andExpect(content().string(org.hamcrest.Matchers.containsString("VPN issue")));
    }
}
