// Mock Data Generator for OLT Manager

const vendors = ['VSOL', 'CDATA', 'BDCOM', 'ZTE', 'Huawei', 'Nokia'];
const technologies = ['GPON', 'EPON', 'XGS-PON'];
const locations = ['DC-Core-01', 'DC-Edge-02', 'POP-North', 'POP-South', 'POP-East', 'POP-West', 'CO-Main', 'CO-Backup'];
const statuses = ['online', 'offline', 'warning'];

const olts = [
  { id: 1, name: 'OLT-VSOL-01', ip: '10.0.1.1', vendor: 'VSOL', technology: 'GPON', model: 'V2801G', location: 'DC-Core-01', status: 'online', uptime: 864000, onuCount: 124, alarmCount: 2, portCount: 8, cpu: 23, memory: 45 },
  { id: 2, name: 'OLT-VSOL-02', ip: '10.0.1.2', vendor: 'VSOL', technology: 'GPON', model: 'V2801G', location: 'DC-Edge-02', status: 'online', uptime: 432000, onuCount: 98, alarmCount: 0, portCount: 8, cpu: 18, memory: 38 },
  { id: 3, name: 'OLT-CDATA-01', ip: '10.0.2.1', vendor: 'CDATA', technology: 'GPON', model: 'FD1616GS', location: 'POP-North', status: 'online', uptime: 1296000, onuCount: 156, alarmCount: 1, portCount: 16, cpu: 35, memory: 62 },
  { id: 4, name: 'OLT-CDATA-02', ip: '10.0.2.2', vendor: 'CDATA', technology: 'EPON', model: 'FD1208S', location: 'POP-South', status: 'warning', uptime: 648000, onuCount: 87, alarmCount: 5, portCount: 8, cpu: 52, memory: 78 },
  { id: 5, name: 'OLT-BDCOM-01', ip: '10.0.3.1', vendor: 'BDCOM', technology: 'EPON', model: 'P3310C', location: 'POP-East', status: 'online', uptime: 1728000, onuCount: 189, alarmCount: 0, portCount: 8, cpu: 28, memory: 41 },
  { id: 6, name: 'OLT-BDCOM-02', ip: '10.0.3.2', vendor: 'BDCOM', technology: 'EPON', model: 'P3608E', location: 'POP-West', status: 'offline', uptime: 0, onuCount: 0, alarmCount: 12, portCount: 8, cpu: 0, memory: 0 },
  { id: 7, name: 'OLT-ZTE-01', ip: '10.0.4.1', vendor: 'ZTE', technology: 'GPON', model: 'C320', location: 'CO-Main', status: 'online', uptime: 2592000, onuCount: 234, alarmCount: 3, portCount: 16, cpu: 41, memory: 55 },
  { id: 8, name: 'OLT-ZTE-02', ip: '10.0.4.2', vendor: 'ZTE', technology: 'XGS-PON', model: 'C300', location: 'CO-Backup', status: 'online', uptime: 2160000, onuCount: 156, alarmCount: 1, portCount: 8, cpu: 33, memory: 48 },
];

const alarmTypes = [
  { type: 'ONU_OFFLINE', severity: 'major', description: 'ONU has gone offline unexpectedly' },
  { type: 'LOW_RX_POWER', severity: 'minor', description: 'Optical receive power below threshold' },
  { type: 'LOS', severity: 'critical', description: 'Loss of signal detected' },
  { type: 'PORT_DOWN', severity: 'major', description: 'PON port link is down' },
  { type: 'HIGH_TEMP', severity: 'warning', description: 'Device temperature exceeds normal range' },
  { type: 'FAN_FAIL', severity: 'critical', description: 'Cooling fan failure detected' },
  { type: 'AUTH_FAIL', severity: 'minor', description: 'ONU authentication failure' },
  { type: 'DATABASE_FULL', severity: 'major', description: 'MAC address database at capacity' },
  { type: 'POWER_SUPPLY', severity: 'critical', description: 'Power supply unit failure' },
  { type: 'VLAN_MISMATCH', severity: 'warning', description: 'VLAN configuration mismatch detected' },
];

function generateSerialNumber() {
  const chars = '0123456789ABCDEF';
  let sn = '';
  for (let i = 0; i < 12; i++) {
    sn += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7) sn += ':';
  }
  return sn;
}

function generateMac() {
  const chars = 'ABCDEF';
  const segments = [];
  for (let i = 0; i < 6; i++) {
    segments.push(chars[Math.floor(Math.random() * 6)] + Math.floor(Math.random() * 10).toString());
  }
  return segments.join(':');
}

function generateOnuModels(vendor) {
  const models = {
    VSOL: ['HM820', 'HM840', 'V2801', 'V2804'],
    CDATA: ['FD601', 'FD701', 'FD801', 'OD-810'],
    BDCOM: ['EP1110', 'EP2204', 'GP2608', 'GP2616'],
    ZTE: ['F660', 'F660A', 'F680', 'ZXHN'],
    Huawei: ['HG8245', 'HG8546', 'EG8145', 'EchoLife'],
    Nokia: ['G-240G', 'G-240W', 'G-010G'],
  };
  return models[vendor] || ['Generic-ONU'];
}

function generateOnus(oltId, vendor, portCount) {
  const onus = [];
  const models = generateOnuModels(vendor);
  
  for (let port = 1; port <= portCount; port++) {
    const onuCountPerPort = Math.floor(Math.random() * 8) + 8;
    for (let i = 1; i <= onuCountPerPort; i++) {
      const rxPower = -15 - Math.random() * 18;
      const status = Math.random() > 0.05 ? 'online' : 'offline';
      const hoursRegistered = Math.floor(Math.random() * 8760);
      
      onus.push({
        id: `${oltId}-${port}-${i}`,
        oltId,
        port,
        onuId: i,
        serialNumber: generateSerialNumber(),
        mac: generateMac(),
        name: `ONT-${oltId}-${port}${i.toString().padStart(2, '0')}`,
        model: models[Math.floor(Math.random() * models.length)],
        status,
        rxPower: rxPower.toFixed(2),
        txPower: (-3 - Math.random() * 3).toFixed(2),
        distance: Math.floor(rxPower * -10 + Math.random() * 500),
        registeredAt: new Date(Date.now() - hoursRegistered * 3600000).toISOString(),
        lastActivity: status === 'online' ? new Date(Date.now() - Math.random() * 3600000).toISOString() : null,
      });
    }
  }
  return onus;
}

function generatePorts(olt) {
  const ports = [];
  for (let i = 1; i <= olt.portCount; i++) {
    const status = Math.random() > 0.1 ? 'up' : 'down';
    const onuCount = status === 'up' ? Math.floor(Math.random() * 12) + 8 : 0;
    const rxPower = status === 'up' ? (-20 - Math.random() * 8).toFixed(2) : null;
    const txPower = status === 'up' ? (2 - Math.random() * 2).toFixed(2) : null;
    
    ports.push({
      id: `${olt.id}-${i}`,
      portNumber: i,
      status,
      onuCount,
      rxPower,
      txPower,
      bandwidth: status === 'up' ? Math.floor(Math.random() * 80) + 10 : 0,
    });
  }
  return ports;
}

function generateAlarms(olts, onus) {
  const alarms = [];
  let alarmId = 1;
  
  olts.filter(o => o.status !== 'offline').forEach(olt => {
    const oltAlarms = Math.floor(Math.random() * 4);
    for (let i = 0; i < oltAlarms; i++) {
      const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];
      const port = Math.floor(Math.random() * olt.portCount) + 1;
      const onu = onus.find(o => o.oltId === olt.id && o.port === port);
      const minutesAgo = Math.floor(Math.random() * 1440);
      
      alarms.push({
        id: alarmId++,
        time: new Date(Date.now() - minutesAgo * 60000).toISOString(),
        oltId: olt.id,
        oltName: olt.name,
        oltIp: olt.ip,
        port,
        onuSn: onu?.serialNumber || null,
        onuName: onu?.name || null,
        alarmType: alarmType.type,
        description: alarmType.description,
        severity: alarmType.severity,
        status: Math.random() > 0.3 ? 'active' : 'acknowledged',
      });
    }
  });
  
  // Add offline OLT alarms
  olts.filter(o => o.status === 'offline').forEach(olt => {
    alarms.push({
      id: alarmId++,
      time: new Date(Date.now() - Math.floor(Math.random() * 60) * 60000).toISOString(),
      oltId: olt.id,
      oltName: olt.name,
      oltIp: olt.ip,
      port: null,
      onuSn: null,
      onuName: null,
      alarmType: 'DEVICE_OFFLINE',
      description: 'OLT device is not responding',
      severity: 'critical',
      status: 'active',
    });
  });
  
  return alarms.sort((a, b) => new Date(b.time) - new Date(a.time));
}

function generateConfigTemplates() {
  return [
    { id: 1, name: 'Basic VLAN Config', vendor: 'all', category: 'VLAN', description: 'Configure native VLAN and trunk ports' },
    { id: 2, name: 'ONU Profile - Home', vendor: 'all', category: 'Profile', description: 'Standard home user profile with 1Gbps downstream' },
    { id: 3, name: 'ONU Profile - Business', vendor: 'all', category: 'Profile', description: 'Business profile with 10Gbps downstream, QoS enabled' },
    { id: 4, name: 'Loop Detection Disable', vendor: 'VSOL', category: 'Security', description: 'Disable loop detection on PON ports' },
    { id: 5, name: 'IGMP Snooping Enable', vendor: 'CDATA', category: 'Multicast', description: 'Enable IGMP snooping for IPTV' },
    { id: 6, name: 'Port Security - MAC Limit', vendor: 'BDCOM', category: 'Security', description: 'Set MAC address learning limit per port' },
    { id: 7, name: 'QoS Mapping', vendor: 'ZTE', category: 'QoS', description: 'Configure DSCP to IEEE 802.1p mapping' },
    { id: 8, name: 'Storm Control', vendor: 'Huawei', category: 'Security', description: 'Enable broadcast/multicast storm control' },
    { id: 9, name: '白玉兰花园区开局配置', vendor: 'ZTE', category: 'Provisioning', description: 'ZTE OLT initial provisioning template' },
    { id: 10, name: 'MA5800 GPON Template', vendor: 'Huawei', category: 'Provisioning', description: 'Huawei MA5800 series initial config' },
  ];
}

function generateUsers() {
  return [
    { id: 1, name: 'Sarah Chen', email: 'sarah.chen@isp.net', role: 'admin', lastLogin: new Date(Date.now() - 3600000).toISOString(), status: 'active', password: 'admin123' },
    { id: 2, name: 'Marcus Johnson', email: 'm.johnson@isp.net', role: 'engineer', lastLogin: new Date(Date.now() - 7200000).toISOString(), status: 'active', password: 'engineer123' },
    { id: 3, name: 'Emily Rodriguez', email: 'e.rodriguez@isp.net', role: 'engineer', lastLogin: new Date(Date.now() - 86400000).toISOString(), status: 'active', password: 'engineer123' },
    { id: 4, name: 'David Kim', email: 'd.kim@isp.net', role: 'viewer', lastLogin: new Date(Date.now() - 172800000).toISOString(), status: 'active', password: 'viewer123' },
    { id: 5, name: 'Admin User', email: 'admin@isp.net', role: 'admin', lastLogin: new Date(Date.now() - 300000).toISOString(), status: 'active', password: 'admin123' },
  ];
}

function generateActivityLog() {
  const actions = [
    { action: 'OLT Config Updated', detail: 'Applied VLAN template to OLT-VSOL-01' },
    { action: 'ONU Rebooted', detail: 'Rebooted ONT-VSOL-01-101 from user request' },
    { action: 'Alarm Acknowledged', detail: 'Critical alarm on OLT-BDCOM-02 acknowledged' },
    { action: 'User Login', detail: 'User sarah.chen@isp.net logged in' },
    { action: 'Template Created', detail: 'New config template "Custom QoS" created' },
    { action: 'ONU Provisioned', detail: 'New ONU provisioned on port 3' },
    { action: 'Alarm Cleared', detail: 'LOW_RX_POWER alarm cleared on OLT-ZTE-01' },
    { action: 'Settings Updated', detail: 'SNMP polling interval changed to 60s' },
  ];
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    timestamp: new Date(Date.now() - i * 3600000 * Math.random() * 5).toISOString(),
    user: generateUsers()[Math.floor(Math.random() * 4)].name,
    ...actions[Math.floor(Math.random() * actions.length)],
  }));
}

// Generate all data
const allOnus = olts.flatMap(olt => generateOnus(olt.id, olt.vendor, olt.portCount));
const allPorts = olts.map(olt => ({
  oltId: olt.id,
  oltName: olt.name,
  ports: generatePorts(olt),
}));
const allAlarms = generateAlarms(olts, allOnus);
const configTemplates = generateConfigTemplates();
const users = generateUsers();
const activityLog = generateActivityLog();

// Statistics
const stats = {
  totalOlts: olts.length,
  onlineOlts: olts.filter(o => o.status === 'online').length,
  offlineOlts: olts.filter(o => o.status === 'offline').length,
  totalOnus: allOnus.length,
  onlineOnus: allOnus.filter(o => o.status === 'online').length,
  activeAlarms: allAlarms.filter(a => a.status === 'active').length,
  criticalAlarms: allAlarms.filter(a => a.severity === 'critical' && a.status === 'active').length,
};

const vendorDistribution = vendors.map(v => ({
  vendor: v,
  count: olts.filter(o => o.vendor === v).length,
})).filter(v => v.count > 0);

const technologyDistribution = technologies.map(t => ({
  technology: t,
  count: olts.filter(o => o.technology === t).length,
})).filter(t => t.count > 0);

// Historical data for charts
function generateHistoricalData(type) {
  const now = Date.now();
  return Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now - (23 - i) * 3600000);
    if (type === 'onu') {
      return {
        time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        online: Math.floor(800 + Math.random() * 100),
        total: 900,
      };
    }
    if (type === 'traffic') {
      return {
        time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        inbound: Math.floor(800 + Math.random() * 400),
        outbound: Math.floor(400 + Math.random() * 200),
      };
    }
    if (type === 'alarms') {
      return {
        time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        critical: Math.floor(Math.random() * 3),
        major: Math.floor(Math.random() * 5),
        minor: Math.floor(Math.random() * 10),
      };
    }
    return {};
  });
}

export {
  olts,
  allOnus,
  allPorts,
  allAlarms,
  configTemplates,
  users,
  activityLog,
  stats,
  vendorDistribution,
  technologyDistribution,
  generateHistoricalData,
  generateSerialNumber,
  generateMac,
};