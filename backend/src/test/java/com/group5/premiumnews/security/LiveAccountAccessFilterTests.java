package com.group5.premiumnews.security;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LiveAccountAccessFilterTests {
    private final LiveAccountAccess access=mock(LiveAccountAccess.class);
    private AuthenticatedUserPrincipal principal(String hash,boolean enabled,String role){return new AuthenticatedUserPrincipal(7L,"qa","qa@example.com",hash,"QA",null,enabled,List.of(new SimpleGrantedAuthority("ROLE_"+role)));}
    private MockHttpServletRequest prepare(){var old=principal("hash",true,"ADMINISTRATOR");SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(old,null,old.authorities()));var r=new MockHttpServletRequest("GET","/api/admin/access");r.getSession();return r;}
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    @Test void changedRoleTakesEffectWithoutRelogin() throws Exception{
        var request=prepare();when(access.load(7L)).thenReturn(principal("hash",true,"READER"));
        new LiveAccountAccessFilter(access).doFilter(request,new MockHttpServletResponse(),new MockFilterChain());
        assertEquals("ROLE_READER",SecurityContextHolder.getContext().getAuthentication().getAuthorities().iterator().next().getAuthority());
    }
    @Test void lockingAccountRevokesExistingSession() throws Exception{
        var request=prepare();when(access.load(7L)).thenReturn(principal("hash",false,"ADMINISTRATOR"));
        new LiveAccountAccessFilter(access).doFilter(request,new MockHttpServletResponse(),new MockFilterChain());
        assertNull(SecurityContextHolder.getContext().getAuthentication());assertNull(request.getSession(false));
    }
    @Test void passwordChangeRevokesOtherSession() throws Exception{
        var request=prepare();when(access.load(7L)).thenReturn(principal("new-hash",true,"ADMINISTRATOR"));
        new LiveAccountAccessFilter(access).doFilter(request,new MockHttpServletResponse(),new MockFilterChain());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
    @Test void anonymousRequestsDoNotReadAccounts() throws Exception{
        new LiveAccountAccessFilter(access).doFilter(new MockHttpServletRequest(),new MockHttpServletResponse(),new MockFilterChain());verifyNoInteractions(access);
    }
}
