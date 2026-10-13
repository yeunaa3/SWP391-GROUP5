package com.group5.premiumnews.controller;

import com.group5.premiumnews.service.AccountProfileService;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.servlet.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/account/profile")
public class AccountProfileController {
    private final AccountProfileService service;
    private final UserRepository users;
    private final SecurityContextRepository contexts;
    public AccountProfileController(AccountProfileService service,UserRepository users,SecurityContextRepository contexts){this.service=service;this.users=users;this.contexts=contexts;}
    @GetMapping public Map<String,Object> get(@AuthenticationPrincipal AuthenticatedUserPrincipal user){return service.get(user);}
    @PutMapping public Map<String,Object> update(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@Valid @RequestBody AccountProfileService.Update body,HttpServletRequest request,HttpServletResponse response){
        var result=service.update(user,body);
        var fresh=AuthenticatedUserPrincipal.from(users.findById(user.id()).orElseThrow());
        var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(fresh,null,fresh.authorities()));
        SecurityContextHolder.setContext(context);contexts.saveContext(context,request,response);
        return result;
    }
}
