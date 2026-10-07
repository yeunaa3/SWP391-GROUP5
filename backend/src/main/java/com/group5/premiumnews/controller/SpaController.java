package com.group5.premiumnews.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Render-only HTML entry points. API and asset paths never fall back to HTML. */
@Controller
@Profile("render")
public class SpaController {
    @GetMapping({"/", "/search", "/login", "/register", "/forgot-password", "/reset-password",
            "/articles/**", "/premium/**", "/account/**", "/business", "/business/**",
            "/ad-manager", "/ad-manager/**", "/admin", "/admin/**", "/advertising-demo"})
    public String index() {
        return "forward:/index.html";
    }
}
