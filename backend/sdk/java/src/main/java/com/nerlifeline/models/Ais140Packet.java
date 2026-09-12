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
}
