package com.group5.premiumnews.integration.email;

import java.util.Map;

public interface EmailGateway {
    void send(String recipient, String templateCode, Map<String, Object> variables);
}
