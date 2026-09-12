# NER-LIFELINE Java 21 Enterprise SDK

Official Java SDK for **NER-LIFELINE** (AI-Powered Smart Logistics & Accessibility Platform for the North Eastern Region of India).

---

## Features

- **☕ Java 21 LTS Standard**: Zero mandatory external dependencies (uses standard `java.net.http.HttpClient` with HTTP/2 and Virtual Threads).
- **🛰️ MoRTH AIS-140 VLTD Standard**: Full parsing and serialization of Indian Automotive Industry Standard AIS-140 GPS sentences with XOR 8-bit checksum verification.
- **🛡️ MoRTH VAHAN 4.0 National Register**: Models and queries authentic vehicle registration certificates across all 8 North Eastern states.
- **⚡ Asynchronous CompletableFuture Pipeline**: Non-blocking reactive calls to FastAPI endpoints.
- **🚨 Emergency SOS Dispatch**: One-line programmatic triggering of emergency dispatcher voice/SMS routing to Central Controller (`+91 95705 25463`).
- **🍃 Spring Boot 3 Compatibility**: Ready-to-inject configuration for enterprise backends.

---

## Quickstart

### 1. Maven Dependency

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.nerlifeline</groupId>
    <artifactId>nerlifeline-java-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 2. Query Fleet & MoRTH VAHAN Registry

```java
import com.nerlifeline.NerLifelineClient;

public class Main {
    public static void main(String[] args) {
        NerLifelineClient client = new NerLifelineClient("http://localhost:8000");

        // Asynchronously verify vehicle with MoRTH VAHAN 4.0
        client.verifyVehiclePlateAsync("AS-01-EV-4421")
              .thenAccept(vahanJson -> System.out.println("MoRTH RC Certificate: " + vahanJson))
              .join();
    }
}
```

### 3. Parse and Generate AIS-140 Telemetry Sentences

```java
import com.nerlifeline.models.Ais140Packet;

// Parse incoming GPS packet from vehicle tracking device
String nmea = "$AIS140,AS-01-EV-4421,864192051144210,26.237451,91.958621,42.50,128.00,1,0*2F";
Ais140Packet packet = Ais140Packet.fromNmeaString(nmea);

System.out.println("Plate: " + packet.vehicleNumber());
System.out.println("Valid Fix: " + packet.hasValidGpsFix());
System.out.println("Within North East India: " + packet.isWithinNorthEastCorridor());

// Serialize to compliant AIS-140 sentence with computed checksum
String serialized = packet.toNmeaString();
System.out.println("NMEA Frame: " + serialized);
```

### 4. Running the Telemetry Listener Daemon

```java
import com.nerlifeline.telemetry.Ais140TelemetryListener;

// Start non-blocking listener on TCP port 8092 powered by Virtual Threads
Ais140TelemetryListener listener = new Ais140TelemetryListener(8092, null);
listener.start();
```

---

## Models Included

1. `Ais140Packet`: NMEA 0183 / AIS-140 sentence parser and serializer.
2. `Vehicle`: Real-time vehicle telemetry and fuel state record.
3. `VahanCertificate`: MoRTH VAHAN 4.0 Registration Certificate with masked chassis and fitness checks.
4. `RouteRiskReport`: Mountain terrain and monsoon risk assessment model.
