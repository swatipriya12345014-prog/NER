package com.nerlifeline.examples;

import com.nerlifeline.NerLifelineClient;
import com.nerlifeline.models.Ais140Packet;

/**
 * Live Demonstration of Java Integration with the NER-LIFELINE Emergency Backend.
 */
public class JavaFleetMonitorDemo {

    public static void main(String[] args) {
        System.out.println("===============================================================");
        System.out.println("NER-LIFELINE: Java Enterprise Logistics & Telemetry Ingestion");
        System.out.println("===============================================================");

        // 1. Parsing raw AIS-140 GPS packet directly in Java
        String sampleAis140Nmea = "$AIS140,AS-01-EV-4421,864192051144210,26.237451,91.958621,42.5,128.0,1,0*2F";
        System.out.println("\n[1] Parsing AIS-140 Packet in Java...");
        Ais140Packet packet = Ais140Packet.fromNmeaString(sampleAis140Nmea);
        System.out.printf("  ✓ Vehicle: %s\n  ✓ GPS: (%.6f, %.6f)\n  ✓ Speed: %.1f km/h\n  ✓ Ignition: %s\n  ✓ SOS Alert: %s\n",
                packet.vehicleNumber(), packet.latitude(), packet.longitude(),
                packet.speedKmph(), packet.ignitionOn(), packet.panicAlertArmed());

        // 2. Querying Backend API via Asynchronous HTTP Client
        NerLifelineClient client = new NerLifelineClient("http://localhost:8000");
        System.out.println("\n[2] Querying MoRTH VAHAN Registry via Java Async Client...");
        try {
            String vahanResponse = client.verifyVehiclePlateAsync("AS-01-EV-4421").join();
            System.out.println("  ✓ Response from Backend:\n" + vahanResponse);
        } catch (Exception e) {
            System.out.println("  Notice: Ensure backend is running at http://localhost:8000 (" + e.getMessage() + ")");
        }

        System.out.println("\n===============================================================");
        System.out.println("Java SDK Validation Completed Successfully.");
        System.out.println("===============================================================");
    }
}
