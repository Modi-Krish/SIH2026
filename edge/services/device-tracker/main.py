import time
import json
import random
import paho.mqtt.client as mqtt

MQTT_BROKER = "localhost" # In production, this would be the remote MQTT server IP
MQTT_PORT = 1883
CLASSROOM_ID = "CLASS-101"

# Mock MAC addresses of students
REGISTERED_MACS = [
    "02:17:D6:CD:26:D6",
    "00:1A:2B:3C:4D:5E",
    "AA:BB:CC:DD:EE:FF",
    "11:22:33:44:55:66"
]

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[{CLASSROOM_ID}] Connected to MQTT Broker!")
    else:
        print(f"Failed to connect, return code {rc}")

def simulate_wifi_sniffing():
    """Simulates sniffing Wi-Fi probe requests from student phones."""
    client = mqtt.Client(f"DeviceTracker_{CLASSROOM_ID}")
    client.on_connect = on_connect
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        print(f"Warning: Could not connect to MQTT broker ({e}). Running in isolated mode.")
        client = None

    if client:
        client.loop_start()

    print(f"Started Wi-Fi Device Tracker for {CLASSROOM_ID}...")
    
    try:
        while True:
            # Simulate a probe request burst every 5 seconds
            for mac in REGISTERED_MACS:
                # 80% chance the student is present and emits a probe
                if random.random() < 0.8:
                    rssi = random.randint(-85, -40) # Signal strength
                    payload = {
                        "classroom_id": CLASSROOM_ID,
                        "mac_address": mac,
                        "rssi": rssi,
                        "timestamp": int(time.time()),
                        "type": "probe_request"
                    }
                    
                    topic = f"sapls/attendance/{CLASSROOM_ID}/probes"
                    
                    if client:
                        client.publish(topic, json.dumps(payload))
                    
                    print(f"Sniffed: {mac} | RSSI: {rssi} dBm -> Published to {topic}")
            
            time.sleep(5)
    except KeyboardInterrupt:
        print("Stopping tracker...")
        if client:
            client.loop_stop()
            client.disconnect()

if __name__ == "__main__":
    simulate_wifi_sniffing()
