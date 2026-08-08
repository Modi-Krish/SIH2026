import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  onModuleInit() {
    this.connectToBroker();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private connectToBroker() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    
    this.logger.log(`Connecting to MQTT broker at ${brokerUrl}...`);
    this.client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 60000, // Try reconnecting every 60s instead of instantly
    });

    let hasLoggedError = false;

    this.client.on('connect', () => {
      hasLoggedError = false;
      this.logger.log('Connected to MQTT broker successfully.');
      this.subscribeToTopics();
    });

    this.client.on('error', (err) => {
      if (!hasLoggedError) {
        this.logger.error(`MQTT Error: ${err.message} (further connection errors suppressed)`);
        hasLoggedError = true;
      }
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message.toString());
    });
  }

  private subscribeToTopics() {
    // Subscribe to all classroom probe requests
    const topic = 'sapls/attendance/+/probes';
    this.client.subscribe(topic, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${topic}`, err);
      } else {
        this.logger.log(`Subscribed to topic: ${topic}`);
      }
    });
  }

  private handleMessage(topic: string, message: string) {
    try {
      const payload = JSON.parse(message);
      // Expected payload: { classroom_id, mac_address, rssi, timestamp, type }
      
      if (payload.type === 'probe_request') {
        // In a real system, map mac_address to a student and update active session in Redis/DB
        this.logger.debug(`[Edge] Classroom ${payload.classroom_id} detected MAC ${payload.mac_address} (RSSI: ${payload.rssi})`);
      }
    } catch (e) {
      this.logger.error(`Failed to parse MQTT message on topic ${topic}: ${message}`);
    }
  }
}
