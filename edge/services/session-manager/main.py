import time
import json
import paho.mqtt.client as mqtt

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
CLASSROOM_ID = "CLASS-101"

# Dictionary to hold the last seen time for each MAC
active_sessions = {}

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[{CLASSROOM_ID} Session Manager] Connected to MQTT Broker!")
        topic = f"sapls/attendance/{CLASSROOM_ID}/probes"
        client.subscribe(topic)
        print(f"Subscribed to {topic}")
    else:
        print(f"Failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        mac = payload.get("mac_address")
        rssi = payload.get("rssi")
        
        # Only process strong signals (assuming -75 dBm is the threshold for being inside)
        if rssi and rssi > -75:
            active_sessions[mac] = time.time()
            print(f"Session updated for {mac} (Signal: {rssi} dBm)")
    except Exception as e:
        print(f"Error processing message: {e}")

def run_session_manager():
    client = mqtt.Client(f"SessionManager_{CLASSROOM_ID}")
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
    except Exception as e:
        print(f"Could not connect to MQTT broker: {e}")
        return

    print("Session Manager running. Press Ctrl+C to exit.")
    try:
        while True:
            # Every 10 seconds, check for stale sessions (students who left)
            current_time = time.time()
            stale_macs = []
            
            for mac, last_seen in active_sessions.items():
                if current_time - last_seen > 30: # 30 seconds without a probe -> considered left
                    stale_macs.append(mac)
            
            for mac in stale_macs:
                print(f"Session ended for {mac}. Student may have left the classroom.")
                del active_sessions[mac]
                
            time.sleep(10)
    except KeyboardInterrupt:
        print("Stopping session manager...")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    run_session_manager()
