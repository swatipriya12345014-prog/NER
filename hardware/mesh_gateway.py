"""
LIFELINE MESH Gateway Simulator & Hardware Bridge
Connects LoRa / ESP32 nodes to the NER-LIFELINE FastAPI backend.
"""

import time
import random
import requests
import json
from datetime import datetime

BACKEND_API_URL = "http://localhost:8000/api/mesh/telemetry"

SIMULATED_NODES = [
    {"node_id": "LORA-SELA-PASS-01", "state": "Arunachal Pradesh", "lat": 27.505, "lng": 92.102},
    {"node_id": "LORA-LUMSHNONG-02", "state": "Meghalaya", "lat": 25.185, "lng": 92.380},
    {"node_id": "LORA-CHURACHAND-03", "state": "Manipur", "lat": 24.333, "lng": 93.670},
    {"node_id": "LORA-KOHIMA-NH2-04", "state": "Nagaland", "lat": 25.674, "lng": 94.110},
    {"node_id": "LORA-GUWAHATI-HUB", "state": "Assam", "lat": 26.144, "lng": 91.736},
]

def generate_telemetry_packet(node):
    battery = random.randint(72, 99)
    rssi = random.randint(-95, -55)
    temp = round(random.uniform(2.5, 6.5), 1)  # Cold-chain temp range in Celsius

    return {
        "node_id": node["node_id"],
        "state": node["state"],
        "battery_pct": battery,
        "signal_rssi_dbm": rssi,
        "is_online": True,
        "lat": node["lat"] + round(random.uniform(-0.005, 0.005), 4),
        "lng": node["lng"] + round(random.uniform(-0.005, 0.005), 4),
        "payload_message": f"Mesh ping ok | Cold-chain temp: {temp}C",
        "timestamp": datetime.utcnow().isoformat()
    }

def transmit_packet(packet):
    try:
        response = requests.post(BACKEND_API_URL, json=packet, timeout=3)
        if response.status_code == 200:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Transmitted packet from {packet['node_id']} (RSSI: {packet['signal_rssi_dbm']} dBm)")
        else:
            print(f"Server response code: {response.status_code}")
    except requests.exceptions.RequestException:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Gateway offline or backend buffering packet from {packet['node_id']}")

def run_simulation(cycles=5):
    print("Starting LIFELINE MESH Gateway Bridge (LoRa 865-867MHz India Band)...")
    for cycle in range(cycles):
        node = random.choice(SIMULATED_NODES)
        packet = generate_telemetry_packet(node)
        transmit_packet(packet)
        time.sleep(2)
    print("LIFELINE MESH Gateway simulation cycle completed.")

if __name__ == "__main__":
    run_simulation()
