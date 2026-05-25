import express from 'express';
import cors from 'cors';
import snmp from 'net-snmp';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// ─── SNMP SESSION HELPER ───────────────────────────────────────────────────────
function createSession(ip, community, port) {
  return snmp.createSession(ip, community, {
    port: parseInt(port) || 161,
    timeout: 5000,
    retries: 1,
    version: snmp.Version2c,
  });
}

// ─── SNMP GET SINGLE OID ──────────────────────────────────────────────────────
function snmpGet(session, oids) {
  return new Promise((resolve, reject) => {
    session.get(oids, (error, varbinds) => {
      if (error) return reject(error);
      const results = {};
      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) {
          results[vb.oid] = null;
        } else {
          results[vb.oid] = Buffer.isBuffer(vb.value) ? vb.value.toString('utf8').replace(/\0/g, '').trim() : vb.value;
        }
      }
      resolve(results);
    });
  });
}

// ─── SNMP WALK TABLE ──────────────────────────────────────────────────────────
function snmpWalk(session, oid) {
  return new Promise((resolve, reject) => {
    const results = [];
    session.walk(oid, 20, (varbinds) => {
      for (const vb of varbinds) {
        if (!snmp.isVarbindError(vb)) {
          results.push({
            oid: vb.oid,
            value: Buffer.isBuffer(vb.value) ? vb.value.toString('utf8').replace(/\0/g, '').trim() : vb.value,
          });
        }
      }
    }, (error) => {
      if (error) return reject(error);
      resolve(results);
    });
  });
}

// ─── FORMAT UPTIME ────────────────────────────────────────────────────────────
function formatTimeticks(ticks) {
  // timeticks are in hundredths of a second
  return Math.floor(parseInt(ticks) / 100);
}

// ─── FORMAT SPEED ─────────────────────────────────────────────────────────────
function formatSpeed(bps) {
  const n = parseInt(bps);
  if (n >= 100000000000) return '100Gbps';
  if (n >= 10000000000) return '10Gbps';
  if (n >= 1000000000) return '1Gbps';
  if (n >= 100000000) return '100Mbps';
  if (n >= 10000000) return '10Mbps';
  if (n > 0) return `${n} bps`;
  return 'Unknown';
}

// ─── CONVERT OCTETS DELTA TO Mbps (approx) ───────────────────────────────────
function octetsToMbps(octets) {
  // This is a snapshot, not a delta — so we just show MB received, not rate
  const mb = Math.round(parseInt(octets) / 1024 / 1024);
  return mb;
}

// ─── MAIN SNMP POLL ENDPOINT ─────────────────────────────────────────────────
app.post('/api/snmp/poll', async (req, res) => {
  const {
    ip,
    community = 'public',
    port = 161,
    vendor = 'Generic',
    deviceType = 'olt',
  } = req.body;

  const logs = [];
  const log = (msg) => {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logs.push(line);
    console.log(line);
  };

  log(`Starting SNMP v2c session → ${ip}:${port}  community="${community}"`);

  const session = createSession(ip, community, port);

  try {
    // ── STEP 1: Basic MIB-II system group ────────────────────────────────────
    log('GET sysDescr (1.3.6.1.2.1.1.1.0) / sysUpTime (1.3.6.1.2.1.1.3.0) / sysName (1.3.6.1.2.1.1.5.0)');
    const sysResult = await snmpGet(session, [
      '1.3.6.1.2.1.1.1.0',
      '1.3.6.1.2.1.1.3.0',
      '1.3.6.1.2.1.1.5.0',
      '1.3.6.1.2.1.1.4.0', // sysContact
      '1.3.6.1.2.1.1.6.0', // sysLocation
    ]);

    const sysDescr = sysResult['1.3.6.1.2.1.1.1.0'] || 'N/A';
    const sysUpTimeTicks = sysResult['1.3.6.1.2.1.1.3.0'] || 0;
    const sysName = sysResult['1.3.6.1.2.1.1.5.0'] || ip;
    const sysContact = sysResult['1.3.6.1.2.1.1.4.0'] || 'N/A';
    const sysLocation = sysResult['1.3.6.1.2.1.1.6.0'] || 'N/A';
    const uptimeSecs = formatTimeticks(sysUpTimeTicks);

    log(`  sysDescr   : ${sysDescr}`);
    log(`  sysName    : ${sysName}`);
    log(`  sysUpTime  : ${sysUpTimeTicks} timeticks = ${uptimeSecs} seconds`);
    log(`  sysContact : ${sysContact}`);
    log(`  sysLocation: ${sysLocation}`);

    // ── STEP 2: Vendor-specific OIDs for CPU / Memory / Temperature / Serial ──
    log(`Querying vendor-specific OIDs for [${vendor}] telemetry...`);

    const VENDOR_OIDS = {
      VSOL: {
        cpu:       '1.3.6.1.4.1.37949.2.1.2.2.0',
        memory:    '1.3.6.1.4.1.37949.2.1.2.3.0',
        temp:      '1.3.6.1.4.1.37949.2.1.2.10.0',
        serial:    '1.3.6.1.4.1.37949.2.1.1.1.0',
        hwVersion: '1.3.6.1.4.1.37949.2.1.1.3.0',
        swVersion: '1.3.6.1.4.1.37949.2.1.1.4.0',
        mac:       '1.3.6.1.4.1.37949.2.1.1.2.0',
      },
      CDATA: {
        cpu:       '1.3.6.1.4.1.34592.1.3.1.1.0',
        memory:    '1.3.6.1.4.1.34592.1.3.1.2.0',
        temp:      '1.3.6.1.4.1.34592.1.3.1.4.0',
        serial:    '1.3.6.1.4.1.34592.1.1.1.1.0',
        hwVersion: '1.3.6.1.4.1.34592.1.1.1.3.0',
        swVersion: '1.3.6.1.4.1.34592.1.1.1.4.0',
      },
      BDCOM: {
        cpu:    '1.3.6.1.4.1.5504.1.1.1.0',
        memory: '1.3.6.1.4.1.5504.1.1.2.0',
      },
      ZTE: {
        cpu:    '1.3.6.1.4.1.3902.1012.3.28.1.1.1.3.1',
        memory: '1.3.6.1.4.1.3902.1012.3.28.1.1.1.4.1',
        temp:   '1.3.6.1.4.1.3902.1012.3.28.1.1.1.9.1',
      },
      Huawei: {
        cpu:    '1.3.6.1.4.1.2011.6.3.4.1.2.0.0.0',
        memory: '1.3.6.1.4.1.2011.6.3.4.1.3.0.0.0',
        temp:   '1.3.6.1.4.1.2011.6.3.4.1.1.0.0.0',
        serial: '1.3.6.1.4.1.2011.6.2.1.1.3.0',
      },
      Juniper: {
        cpu:    '1.3.6.1.4.1.2636.3.1.13.1.8.9.1.0.0',
        memory: '1.3.6.1.4.1.2636.3.1.13.1.11.9.1.0.0',
        temp:   '1.3.6.1.4.1.2636.3.1.13.1.7.9.1.0.0',
      },
      Cisco: {
        cpu:    '1.3.6.1.4.1.9.9.109.1.1.1.1.5.1',
        memory: '1.3.6.1.4.1.9.9.48.1.1.1.6.1',
        temp:   '1.3.6.1.4.1.9.9.13.1.3.1.3.1',
      },
      MikroTik: {
        cpu:    '1.3.6.1.4.1.14988.1.1.3.14.0',
        memory: '1.3.6.1.4.1.14988.1.1.3.10.0',
        temp:   '1.3.6.1.4.1.14988.1.1.3.11.0',
      },
    };

    const vOids = VENDOR_OIDS[vendor] || {};
    const oidList = Object.entries(vOids).map(([key, oid]) => ({ key, oid }));
    let cpu = null, memory = null, temperature = null, serialNumber = null;
    let hardwareVersion = null, softwareVersion = null, mac = null;

    if (oidList.length > 0) {
      try {
        const vendorResult = await snmpGet(session, oidList.map(e => e.oid));
        for (const { key, oid } of oidList) {
          const val = vendorResult[oid];
          log(`  [${vendor}] ${key} OID ${oid} → ${val ?? 'N/A (no response)'}`);
          if (key === 'cpu' && val !== null)       cpu = parseInt(val);
          if (key === 'memory' && val !== null)    memory = parseInt(val);
          if (key === 'temp' && val !== null)      temperature = parseInt(val);
          if (key === 'serial' && val !== null)    serialNumber = val;
          if (key === 'hwVersion' && val !== null) hardwareVersion = val;
          if (key === 'swVersion' && val !== null) softwareVersion = val;
          if (key === 'mac' && val !== null)       mac = val;
        }
      } catch (vendorErr) {
        log(`  WARNING: Vendor OID walk failed: ${vendorErr.message}`);
      }
    } else {
      log(`  No vendor-specific OID profile for [${vendor}]. Skipping telemetry OIDs.`);
    }

    // ── STEP 3: Walk ifTable for interfaces ───────────────────────────────────
    log('Walking ifDescr   (1.3.6.1.2.1.2.2.1.2)...');
    const ifDescrs = await snmpWalk(session, '1.3.6.1.2.1.2.2.1.2');
    log(`  Found ${ifDescrs.length} interface descriptors`);

    log('Walking ifOperStatus (1.3.6.1.2.1.2.2.1.8)...');
    const ifOperStatus = await snmpWalk(session, '1.3.6.1.2.1.2.2.1.8');

    log('Walking ifAdminStatus (1.3.6.1.2.1.2.2.1.7)...');
    const ifAdminStatus = await snmpWalk(session, '1.3.6.1.2.1.2.2.1.7');

    log('Walking ifSpeed   (1.3.6.1.2.1.2.2.1.5)...');
    const ifSpeeds = await snmpWalk(session, '1.3.6.1.2.1.2.2.1.5');

    log('Walking ifAlias   (1.3.6.1.2.1.31.1.1.1.18) for descriptions...');
    let ifAliases = [];
    try {
      ifAliases = await snmpWalk(session, '1.3.6.1.2.1.31.1.1.1.18');
    } catch (_) {
      log('  ifAlias not available on this device.');
    }

    log('Walking ifInOctets  (1.3.6.1.2.1.2.2.1.10)...');
    const ifInOctets = await snmpWalk(session, '1.3.6.1.2.1.2.2.1.10');

    log('Walking ifOutOctets (1.3.6.1.2.1.2.2.1.16)...');
    const ifOutOctets = await snmpWalk(session, '1.3.6.1.2.1.2.2.1.16');

    // Build interface map by index
    const ifMap = {};
    for (const item of ifDescrs) {
      const idx = item.oid.split('.').pop();
      const name = item.value || `if${idx}`;
      // Skip loopback and null interfaces
      const lower = name.toLowerCase();
      if (lower === 'lo' || lower === 'null0' || lower === 'loopback' || lower.startsWith('loop')) continue;
      ifMap[idx] = { name, desc: '', speed: 'Unknown', admin: 'up', oper: 'down', rxMbps: 0, txMbps: 0 };
    }

    for (const item of ifAliases) {
      const idx = item.oid.split('.').pop();
      if (ifMap[idx] && item.value) ifMap[idx].desc = item.value;
    }
    for (const item of ifSpeeds) {
      const idx = item.oid.split('.').pop();
      if (ifMap[idx]) ifMap[idx].speed = formatSpeed(item.value);
    }
    for (const item of ifOperStatus) {
      const idx = item.oid.split('.').pop();
      if (ifMap[idx]) ifMap[idx].oper = parseInt(item.value) === 1 ? 'up' : 'down';
    }
    for (const item of ifAdminStatus) {
      const idx = item.oid.split('.').pop();
      if (ifMap[idx]) ifMap[idx].admin = parseInt(item.value) === 1 ? 'up' : 'down';
    }
    for (const item of ifInOctets) {
      const idx = item.oid.split('.').pop();
      if (ifMap[idx]) ifMap[idx].rxMbps = octetsToMbps(item.value);
    }
    for (const item of ifOutOctets) {
      const idx = item.oid.split('.').pop();
      if (ifMap[idx]) ifMap[idx].txMbps = octetsToMbps(item.value);
    }

    const interfaces = Object.values(ifMap);
    for (const intf of interfaces) {
      log(`  INTF: ${intf.name.padEnd(28)} admin=${intf.admin}  oper=${intf.oper}  speed=${intf.speed}  alias="${intf.desc}"`);
    }

    session.close();
    log(`SNMP session closed. Poll complete. interfaces=${interfaces.length}`);

    res.json({
      success: true,
      logs,
      data: {
        sysName,
        sysDescr,
        sysContact,
        sysLocation,
        uptime: uptimeSecs,
        cpu,
        memory,
        temperature,
        serialNumber,
        hardwareVersion,
        softwareVersion,
        mac,
        interfaces,
      },
    });

  } catch (err) {
    session.close();
    log(`SNMP ERROR: ${err.message}`);
    log(`Possible causes:`);
    log(`  1. Device at ${ip} is not reachable (firewall / wrong IP)`);
    log(`  2. SNMP community string "${community}" is incorrect`);
    log(`  3. SNMP agent is disabled on the device`);
    log(`  4. UDP port ${port} is blocked`);

    res.status(502).json({
      success: false,
      error: err.message,
      logs,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[SNMP Backend] Listening on http://localhost:${PORT}`);
});
