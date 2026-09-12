package com.nerlifeline.config;

import com.nerlifeline.NerLifelineClient;

/**
 * Spring Boot 3 Configuration Component for NER-LIFELINE.
 * Allows effortless dependency injection into enterprise Spring services:
 * 
 * <pre>
 * &#64;Autowired
 * private NerLifelineClient lifelineClient;
 * </pre>
 */
public class NerLifelineSpringConfig {

    private final String backendUrl;

    public NerLifelineSpringConfig() {
        this("http://localhost:8000");
    }

    public NerLifelineSpringConfig(String backendUrl) {
        this.backendUrl = backendUrl != null && !backendUrl.isBlank() ? backendUrl : "http://localhost:8000";
    }

    public NerLifelineClient nerLifelineClient() {
        return new NerLifelineClient(this.backendUrl);
    }
}
