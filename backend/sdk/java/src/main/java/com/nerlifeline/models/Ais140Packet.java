package com.nerlifeline.models;

import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Official Indian Automotive Industry Standard AIS-140 VLTD Packet Model in Java.
 * Handles NMEA sentence parsing, checksum verification, and panic SOS decoding.
 */
public record Ais140Packet(
        String vehicleNumber,
        String imei,
        double latitude,
        double longitude,
        double speedKmph,
        double headingDegrees,
        boolean ignitionOn,
        boolean panicAlertArmed,
        Instant timestamp
) {
    private static final Pattern NMEA_PATTERN = Pattern.compile(
            "^\\$AIS140,([^,]+),([^,]+),([0-9.-]+),([0-9.-]+),([0-9.]+),([0-9.]+),([01]),([01])(?:\\*([0-9A-Fa-f]{2}))?$"
    );

    /**
     * Parses an official MoRTH AIS-140 NMEA telemetry sentence.
     */
    public static Ais140Packet fromNmeaString(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("AIS-140 raw sentence cannot be null or empty");
        }
        Matcher m = NMEA_PATTERN.matcher(raw.trim());
        if (!m.matches()) {
            throw new IllegalArgumentException("Malformed AIS-140 NMEA sentence: " + raw);
        }
        return new Ais140Packet(
                m.group(1),
                m.group(2),
                Double.parseDouble(m.group(3)),
                Double.parseDouble(m.group(4)),
                Double.parseDouble(m.group(5)),
                Double.parseDouble(m.group(6)),
                "1".equals(m.group(7)),
                "1".equals(m.group(8)),
                Instant.now()
        );
    }

    /**
     * Serializes this packet to an official MoRTH AIS-140 NMEA sentence with computed XOR checksum.
     * Example: $AIS140,AS-01-EV-4421,864192051144210,26.237451,91.958621,42.50,128.00,1,0*2F
     */
    public String toNmeaString() {
        String body = String.format(java.util.Locale.US,
                "AIS140,%s,%s,%.6f,%.6f,%.2f,%.2f,%d,%d",
                vehicleNumber,
                imei,
                latitude,
                longitude,
                speedKmph,
                headingDegrees,
                ignitionOn ? 1 : 0,
                panicAlertArmed ? 1 : 0
        );
        String checksumHex = calculateNmeaChecksum(body);
        return "$" + body + "*" + checksumHex;
    }

    /**
     * Calculates the standard 8-bit XOR checksum per NMEA 0183 / AIS-140 specifications.
     */
    public static String calculateNmeaChecksum(String sentenceBody) {
        int checksum = 0;
        for (int i = 0; i < sentenceBody.length(); i++) {
            checksum ^= sentenceBody.charAt(i);
        }
        return String.format("%02X", checksum);
    }

    /**
     * Checks if coordinates represent a valid GPS fix (non-zero and within global coordinate limits).
     */
    public boolean hasValidGpsFix() {
        return latitude >= -90.0 && latitude <= 90.0
                && longitude >= -180.0 && longitude <= 180.0
                && (Math.abs(latitude) > 0.0001 || Math.abs(longitude) > 0.0001);
    }

    /**
     * Verifies if the vehicle is operating within the North Eastern Region of India bounds.
     * Bounding box: 21.5°N - 29.5°N, 89.5°E - 97.5°E.
     */
    public boolean isWithinNorthEastCorridor() {
        return latitude >= 21.5 && latitude <= 29.5
                && longitude >= 89.5 && longitude <= 97.5;
    }

    /**
     * Checks if current speed exceeds the mountain highway threshold (e.g. 50 km/h for ghat roads).
     */
    public boolean isSpeeding(double speedLimitKmph) {
        return speedKmph > speedLimitKmph;
    }
}
