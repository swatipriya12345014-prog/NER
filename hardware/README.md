# LIFELINE MESH — Hardware Specifications & Architecture

## Overview
The **LIFELINE MESH** provides an off-grid, disaster-resilient communications backbone across difficult mountainous corridors in the North Eastern Region of India (Assam, Arunachal Pradesh, Meghalaya, Manipur, Mizoram, Nagaland, Sikkim, Tripura) where cellular 4G/5G signals frequently drop due to landslides or monsoons.

## Hardware Specifications
- **Microcontroller**: ESP32-WROOM-32 / ESP32-S3 (Dual-core 240MHz, 8MB Flash).
- **LoRa Transceiver**: Semtech SX1262 or SX1276.
- **Operating Frequency**: **865 MHz – 867 MHz** (Wireless Planning & Coordination / WPC de-licensed ISM band for India).
- **Modulation**: LoRa Spread Spectrum (Spreading Factor SF7 to SF12, Bandwidth 125 kHz).
- **Power Supply**: 18650 Li-ion cells + 6V 3W monocrystalline solar panels with MPPT charge management.
- **Sensors**:
  - GPS Module (NEO-6M / NEO-M8N) for geolocation.
  - Temperature sensor (DS18B20) for medical cold-chain tracking.
  - MPU-6050 Accelerometer/Gyroscope for tilt/landslide detection on roadside relay towers.

## Packet Format
Packets are transmitted as compact binary payloads (under 64 bytes) to maximize LoRa range (up to 15km line-of-sight in valleys):
```text
[Header 2B][NodeID 4B][Latitude 4B][Longitude 4B][Battery 1B][Temp 2B][Status 1B][CRC 2B]
```

## Store-and-Forward / DTN (Delay-Tolerant Networking)
When a relay node is cut off from an internet-connected gateway:
1. It buffers up to 2,048 telemetry packets in non-volatile flash memory (SPIFFS/LittleFS).
2. As soon as a convoy vehicle or drone with an onboard mesh node passes within range, packets are burst-forwarded to the moving node.
3. Upon arriving at a connected depot (e.g. Guwahati or Silchar), the node flushes the buffer to the FastAPI backend at `/api/mesh/telemetry`.
