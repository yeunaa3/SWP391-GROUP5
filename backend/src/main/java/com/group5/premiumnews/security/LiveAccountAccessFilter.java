package com.group5.premiumnews.security;

import java.io.IOException;
import java.util.Objects;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.filter.OncePerRequestFilter;

/** Làm mới quyền trước authorization cho mọi API; không đăng ký servlet filter lần hai. */
public class LiveAccountAccessFilter extends OncePerRequestFilter {
    private final LiveAccountAccess access;
    public LiveAccountAccessFilter(LiveAccountAccess access){this.access=access;}

    /** Giữ session khi chỉ đổi quyền; khóa/xóa/đổi mật khẩu sẽ thu hồi phiên trước request tiếp theo. */
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null && auth.getPrincipal() instanceof AuthenticatedUserPrincipal old) {
            try {
                var fresh=access.load(old.id());
                if(!fresh.enabled() || !Objects.equals(old.password(),fresh.password()))revoke(request);
                else SecurityContextHolder.getContext().setAuthentication(
                    UsernamePasswordAuthenticationToken.authenticated(fresh,null,fresh.authorities()));
            } catch(UsernameNotFoundException missing){revoke(request);}
        }
        chain.doFilter(request,response);
    }
    private void revoke(HttpServletRequest request){
        SecurityContextHolder.clearContext();
        if(request.getSession(false)!=null)request.getSession(false).invalidate();
    }
}
