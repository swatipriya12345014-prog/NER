package com.nerlifeline.models;

import java.time.Instant;
import java.util.List;

/**
 * Route Risk & Terrain Hazard Assessment Record in Java.
 * Computes mountain pass safety incorporating monsoon indices and BRO clearances.
 */
public record RouteRiskReport(
        String routeId,
        String origin,
        String destination,
        String highwayCorridor,
        double distanceKm,
        double estimatedDriveHours,
        int riskScore,
        String riskLevel,
        double monsoonIndex,
        double landslideVulnerability,
        boolean clearedByBro,
        String recommendedAlternative,
        List<String> majorCheckpoints,
        Instant evaluatedAt
) {
    public boolean isSafeForConvoy() {
        return riskScore <= 40;
    }

    public boolean requiresHeavyEscort() {
        return riskScore > 65;
    }
}
