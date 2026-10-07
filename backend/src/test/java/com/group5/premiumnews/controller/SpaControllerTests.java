package com.group5.premiumnews.controller;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SpaControllerTests {
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new SpaController()).build();

    @Test void homeLoadsReactEntryPoint() throws Exception {
        mvc.perform(get("/")).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    }

    @Test void businessDeepLinkLoadsReactEntryPoint() throws Exception {
        mvc.perform(get("/business/campaigns/5/creative"))
                .andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
    }

    @Test void unknownApiIsNotConvertedToHtml() throws Exception {
        mvc.perform(get("/api/unknown-route")).andExpect(status().isNotFound());
    }

    @Test void missingAssetIsNotConvertedToHtml() throws Exception {
        mvc.perform(get("/assets/missing.js")).andExpect(status().isNotFound());
    }
}
