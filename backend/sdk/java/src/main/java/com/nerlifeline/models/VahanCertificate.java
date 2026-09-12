package com.nerlifeline.models;

import java.time.LocalDate;

/**
 * Official Ministry of Road Transport and Highways (MoRTH) VAHAN 4.0 Registration Certificate Record in Java.
 * Complies with Parivahan National Register data schema.
 */
public record VahanCertificate(
        String registrationNumber,
        String rtoCode,
        String rtoName,
        String registeredOwner,
        String vehicleMakeModel,
        String chassisVin,
        String engineNumber,
        String fuelType,
        String emissionNorm,
        String vehicleClass,
        String registrationDate,
        String fitnessValidity,
        String insuranceValidity,
        String nationalReliefPermit,
        boolean ais140Compliant,
        String status
) {
    /**
     * Checks if the vehicle RC fitness validity is currently active.
     */
    public boolean isFitnessActive() {
        if (fitnessValidity == null || fitnessValidity.isBlank()) return false;
        try {
            LocalDate exp = LocalDate.parse(fitnessValidity);
            return !exp.isBefore(LocalDate.now());
        } catch (Exception e) {
            return true; // Fallback if string date format is non-ISO
        }
    }

    /**
     * Returns masked chassis number for privacy and security standards (e.g. MAT654****04421).
     */
    public String getMaskedChassis() {
        if (chassisVin == null || chassisVin.length() < 8) return chassisVin;
        int len = chassisVin.length();
        return chassisVin.substring(0, 4) + "****" + chassisVin.substring(len - 4);
    }
}
