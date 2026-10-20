package com.group5.premiumnews.service;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookmarkServiceTests {
    @Test void invalidPaginationIsRejectedBeforeDatabaseAccess() {
        var jdbc = mock(JdbcTemplate.class); var service = new BookmarkService(jdbc);
        for (int[] input : new int[][]{{-1, 10}, {0, 0}, {0, 51}, {100001, 10}})
            assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class, () -> service.list(17, input[0], input[1])).getStatusCode());
        verifyNoInteractions(jdbc);
    }
    @Test void lookaheadRowIsNotReturnedButIndicatesNextPage() {
        var jdbc = mock(JdbcTemplate.class); var service = new BookmarkService(jdbc);
        var item = new BookmarkService.Item(1, "Article", "article", false, Instant.EPOCH, "News");
        doReturn(List.of(item, item, item)).when(jdbc).query(anyString(), any(RowMapper.class), eq(17L), eq(3), eq(0));
        var page = service.list(17, 0, 2);
        assertEquals(2, page.items().size()); assertTrue(page.hasNext());
    }
    @Test void duplicateSaveSucceedsButUnavailableArticleIsNotFound() {
        var jdbc = mock(JdbcTemplate.class); var service = new BookmarkService(jdbc);
        when(jdbc.update(anyString(), eq(17L), eq(42L))).thenReturn(0);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(42L))).thenReturn(1, 0);
        assertDoesNotThrow(() -> service.save(17, 42));
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> service.save(17, 42)).getStatusCode());
    }
    @Test void removalScopesToBothOwnerAndArticle() {
        var jdbc = mock(JdbcTemplate.class);
        new BookmarkService(jdbc).remove(17, 42);
        verify(jdbc).update("DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?", 17L, 42L);
    }
}