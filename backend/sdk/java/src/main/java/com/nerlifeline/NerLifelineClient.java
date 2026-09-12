package com.nerlifeline;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/**
 * Official Asynchronous Java 21 Client for NER-LIFELINE Backend API.
 * Provides direct Java access to:
 * 1. MoRTH VAHAN 4.0 Vehicle National Register.
 * 2. Real-Time AIS-140 GPS & Fleet Telemetry Streams.
 * 3. Emergency SOS Dispatch Engine.
 * 4. High-Altitude Mountain Route Risk Ingestion.
 */
public class NerLifelineClient {

    private final String backendBaseUrl;
    private final HttpClient httpClient;

    public NerLifelineClient() {
        this("http://localhost:8000");
    }

    public NerLifelineClient(String backendBaseUrl) {
        this.backendBaseUrl = backendBaseUrl.replaceAll("/$", "");
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Retrieves all stored authentic vehicle records from the MoRTH VAHAN 4.0 National Register.
     */
    public CompletableFuture<String> getVahanVehiclesAsync() {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(backendBaseUrl + "/api/vahan/vehicles"))
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

        return httpClient.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenApply(HttpResponse::body);
    }

    /**
     * Live verifies any Indian registration plate (e.g. AS-01-EV-4421) against MoRTH VAHAN.
     */
    public CompletableFuture<String> verifyVehiclePlateAsync(String vehicleNumber) {
        String clean = vehicleNumber.trim().replace(" ", "-");
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(backendBaseUrl + "/api/vahan/verify/" + clean))
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(6))
                .GET()
                .build();

        return httpClient.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenApply(HttpResponse::body);
    }

    /**
     * Triggers synchronization between the application database and the Transport Ministry VAHAN register.
     */
    public CompletableFuture<String> syncTransportMinistryDatabaseAsync() {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(backendBaseUrl + "/api/vahan/sync-database"))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();

        return httpClient.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenApply(HttpResponse::body);
    }

    /**
     * Checks AIS-140 Compliance & active live telemetry stream status.
     */
    public CompletableFuture<String> getAis140StatusAsync() {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(backendBaseUrl + "/api/telemetry/ais140/status"))
                .header("Accept", "application/json")
                .GET()
                .build();

        return httpClient.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenApply(HttpResponse::body);
    }

    /**
     * Dispatches an Emergency SOS Call directly to the Designated Controller (+91 95705 25463).
     */
    public CompletableFuture<String> initiateSosCallAsync(
            String vehicleNumber,
            String driverName,
            double gpsLat,
            double gpsLng,
            String locationName,
            String emergencyType
    ) {
        String jsonPayload = String.format(
                "{\"vehicle_number\":\"%s\",\"driver_name\":\"%s\",\"gps_lat\":%.6f,\"gps_lng\":%.6f,\"location_name\":\"%s\",\"emergency_type\":\"%s\"}",
                vehicleNumber, driverName, gpsLat, gpsLng, locationName, emergencyType
        );

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(backendBaseUrl + "/api/sos/call/initiate"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        return httpClient.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenApply(HttpResponse::body);
    }

    public static void main(String[] args) {
        NerLifelineClient client = new NerLifelineClient();
        System.out.println("=================================================");
        System.out.println("NER-LIFELINE: Java 21 Enterprise Client Active");
        System.out.println("Connecting to Backend: http://localhost:8000");
        System.out.println("=================================================");

        client.getAis140StatusAsync()
                .thenAccept(status -> System.out.println("AIS-140 Status:\n" + status))
                .join();
    }
}
