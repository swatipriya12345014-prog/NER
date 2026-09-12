package com.nerlifeline.models;

import java.time.Instant;

/**
 * Emergency Vehicle & Telemetry State Record in Java.
 */
public record Vehicle(
        String vehicleNumber,
        String driverName,
        String driverPhone,
        String vehicleType,
        String currentRoad,
        String destination,
        double latitude,
        double longitude,
        double currentFuelLitres,
        boolean isInTransit,
        String vahanVerificationStatus,
        Instant lastUpdated
) {
    public boolean isLowFuel() {
        return currentFuelLitres < 15.0;
    }
}
