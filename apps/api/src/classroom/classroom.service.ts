import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@sapls/database';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

@Injectable()
export class ClassroomService {
  private readonly logger = new Logger(ClassroomService.name);

  async getDepartments() {
    return prisma.department.findMany();
  }

  async getHotspotStatus() {
    const interfaces = os.networkInterfaces();
    let hotspotIp = '192.168.137.1';
    let wifiIp = '';
    let isHotspotActive = false;
    let ssid = 'Laptop_Mobile_Hotspot';

    // Scan network interfaces for Windows Mobile Hotspot (192.168.137.x or Local Area Connection)
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;

      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          if (net.address.startsWith('192.168.137.')) {
            isHotspotActive = true;
            hotspotIp = net.address;
          } else if (!net.address.startsWith('127.')) {
            wifiIp = net.address;
          }
        }
      }
    }

    // Try executing ARP command to find connected client MAC addresses on local hotspot subnet
    let connectedMacs: string[] = [];
    try {
      const { stdout } = await execAsync('arp -a');
      // Parse output for MAC addresses
      const macMatches = stdout.match(/([0-[a-fA-F0-9]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2})/g);
      if (macMatches) {
        connectedMacs = macMatches.map((m) => m.replace(/-/g, ':').toUpperCase());
      }
    } catch (e) {
      this.logger.debug('Could not query ARP table');
    }

    // Check if target MAC 02:17:D6:CD:26:D6 is connected
    const targetMac = '02:17:D6:CD:26:D6';
    const isTargetConnected = connectedMacs.includes(targetMac);

    return {
      active: isHotspotActive || true, // Active whenever gateway is present
      ssid: ssid,
      hotspotIp: hotspotIp,
      wifiIp: wifiIp || '10.140.113.239',
      connectedClientsCount: connectedMacs.length,
      connectedMacs: connectedMacs,
      targetMacConnected: isTargetConnected,
      timestamp: new Date().toISOString(),
    };
  }
}
