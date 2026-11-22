package dev.smartdesk.dto;
import jakarta.validation.constraints.*;
import dev.smartdesk.enums.*;
public final class Requests {
    public record Login(@NotBlank @Email @Size(max=254) String email, @NotBlank @Size(max=72) String password) {}
    public record Registration(@NotBlank @Size(max=80) String name, @NotBlank @Email @Size(max=254) String email, @NotBlank @Size(min=12,max=72) String password) {}
    public record NewTicket(@NotBlank @Size(max=160) String title, @NotBlank @Size(max=4000) String description, @NotNull Long categoryId, @NotNull Long priorityId) {}
    public record Assignment(@NotNull Long engineerId) {}
    public record Transition(@NotNull Status status, @Size(max=3500) String note) {}
    public record Message(@NotBlank @Size(max=4000) String text) {}
    public record CatalogItem(Long id, @NotBlank @Size(max=80) String name) {}
    public record UserEdit(@NotNull Role role, @NotNull Boolean active) {}
}
