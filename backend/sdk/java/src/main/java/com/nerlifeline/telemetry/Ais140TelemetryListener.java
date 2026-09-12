package com.nerlifeline.telemetry;

import com.nerlifeline.NerLifelineClient;
import com.nerlifeline.models.Ais140Packet;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Real-Time AIS-140 Telemetry Socket Listener in Java 21.
 * Listens for raw TCP packets from GPS trackers and LoRa mesh gateways,
 * validates NMEA sentences, and forwards them to the NER-LIFELINE backend.
 */
public class Ais140TelemetryListener {

    private final int port;
    private final NerLifelineClient client;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicLong packetsReceived = new AtomicLong(0);
    private final AtomicLong packetsValid = new AtomicLong(0);
    private ServerSocket serverSocket;
    private ExecutorService executorService;

    public Ais140TelemetryListener(int port, NerLifelineClient client) {
        this.port = port;
        this.client = client != null ? client : new NerLifelineClient();
    }

    /**
     * Starts the listener daemon using Java 21 Virtual Threads.
     */
    public synchronized void start() throws IOException {
        if (running.get()) return;

        this.serverSocket = new ServerSocket(port);
        this.running.set(true);
        // Utilize Java 21 Virtual Threads for non-blocking concurrent client socket handling
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();

        System.out.println("🛰️ [JAVA AIS-140 LISTENER] Listening on TCP port " + port + "...");

        executorService.submit(() -> {
            while (running.get()) {
                try {
                    Socket clientSocket = serverSocket.accept();
                    executorService.submit(() -> handleClient(clientSocket));
                } catch (IOException e) {
                    if (!running.get()) break;
                    System.err.println("Listener accept error: " + e.getMessage());
                }
            }
        });
    }

    private void handleClient(Socket socket) {
        try (socket;
             BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                packetsReceived.incrementAndGet();
                try {
                    Ais140Packet packet = Ais140Packet.fromNmeaString(line);
                    packetsValid.incrementAndGet();

                    if (packet.panicAlertArmed()) {
                        System.err.println("🚨 [SOS PANIC DETECTED ON " + packet.vehicleNumber() + "] at "
                                + packet.latitude() + ", " + packet.longitude());
                        client.initiateSosCallAsync(
                                packet.vehicleNumber(),
                                "Emergency Driver",
                                packet.latitude(),
                                packet.longitude(),
                                "Highland Transit Sector",
                                "PANIC_BUTTON_ARMED"
                        );
                    } else {
                        System.out.println("✓ Ingested packet for " + packet.vehicleNumber()
                                + " | Speed: " + packet.speedKmph() + " km/h | Fix: " + packet.hasValidGpsFix());
                    }
                } catch (IllegalArgumentException ex) {
                    System.err.println("Invalid packet ignored: " + ex.getMessage());
                }
            }
        } catch (IOException e) {
            // Client disconnected
        }
    }

    public synchronized void stop() {
        if (!running.get()) return;
        running.set(false);
        try {
            if (serverSocket != null) serverSocket.close();
            if (executorService != null) executorService.shutdownNow();
        } catch (IOException ignored) {}
        System.out.println("🛑 [JAVA AIS-140 LISTENER] Stopped.");
    }

    public long getPacketsReceived() {
        return packetsReceived.get();
    }

    public long getPacketsValid() {
        return packetsValid.get();
    }

    public static void main(String[] args) throws IOException, InterruptedException {
        Ais140TelemetryListener listener = new Ais140TelemetryListener(8092, new NerLifelineClient());
        listener.start();

        System.out.println("Listener started. Sending sample synthetic packet in 1 second...");
        Thread.sleep(1000);

        // Self-test with synthetic socket connection
        try (Socket testSocket = new Socket("localhost", 8092)) {
            Ais140Packet sample = new Ais140Packet(
                    "AS-01-EV-4421", "864192051144210", 26.237451, 91.958621,
                    45.0, 180.0, true, false, java.time.Instant.now()
            );
            testSocket.getOutputStream().write((sample.toNmeaString() + "\n").getBytes());
            testSocket.getOutputStream().flush();
        }

        Thread.sleep(500);
        System.out.println("Packets Received: " + listener.getPacketsReceived() + ", Valid: " + listener.getPacketsValid());
        listener.stop();
    }
}
