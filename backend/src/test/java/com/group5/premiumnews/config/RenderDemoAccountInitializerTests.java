package com.group5.premiumnews.config;

import com.group5.premiumnews.entity.Role;
import com.group5.premiumnews.entity.User;
import com.group5.premiumnews.repository.RoleRepository;
import com.group5.premiumnews.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RenderDemoAccountInitializerTests {
    private final UserRepository users = mock(UserRepository.class);
    private final RoleRepository roles = mock(RoleRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    @Test void rejectsMissingOrShortSecretBeforeWriting() {
        for (String secret : new String[]{"", "Demo@12345", "short"}) {
            assertThrows(IllegalStateException.class, () ->
                new RenderDemoAccountInitializer(users, roles, encoder, jdbc, secret).run());
        }
        verifyNoInteractions(users, roles, encoder, jdbc);
    }

    @Test void neverResetsOrElevatesExistingAccounts() {
        when(users.existsByUsernameIgnoreCase(anyString())).thenReturn(true);
        new RenderDemoAccountInitializer(users, roles, encoder, jdbc, "private-test-secret-123").run();
        verify(users, times(9)).existsByUsernameIgnoreCase(anyString());
        verifyNoMoreInteractions(users);
        verifyNoInteractions(roles, encoder, jdbc);
    }

    @Test void createsReaderWithEncodedPasswordAndNoSubscription() {
        when(users.existsByUsernameIgnoreCase(anyString())).thenAnswer(i -> !i.getArgument(0).equals("reader.demo"));
        when(roles.findByNameAndStatus("READER", "ACTIVE")).thenReturn(Optional.of(mock(Role.class)));
        when(encoder.encode("private-test-secret-123")).thenReturn("encoded-secret");
        new RenderDemoAccountInitializer(users, roles, encoder, jdbc, "private-test-secret-123").run();
        var captured = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(captured.capture());
        assertEquals("reader.demo", captured.getValue().getUsername());
        assertEquals("encoded-secret", captured.getValue().getHashedPassword());
        assertEquals(1, captured.getValue().getRoles().size());
        verifyNoInteractions(jdbc);
    }
}
