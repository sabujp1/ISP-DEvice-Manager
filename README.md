# ISP Device Manager - Multi-Vendor NOC Dashboard

A dark, high-density industrial teleco control room dashboard for ISP network engineers. It combines modern NOC utility operations with multi-vendor terminal emulators and live telemetry simulation.

## Key Features

### 📡 Multi-Vendor OLT Inventory
* **Inventory registry**: Add, edit, or delete OLT chassis with IP maps, SNMP community strings, and locations.
* **PON interface grid**: Expand OLT nodes to inspect PON interfaces.
* **SNMP dynamic scanner**: Devices start with 0 ONUs. Click "Scan & Discover ONUs via SNMP" to simulate an SNMP GetBulk poll that discovers connected ONUs.
* **Signal monitoring**: Optical Rx power colored indicators (🟢 good, 🟡 marginal, 🔴 poor).

### 🌐 Core Infrastructure (Routers & Switches)
* **Chassis inventory**: Supports core routing and switching hardware from **Juniper**, **MikroTik**, **Cisco**, **Huawei**, and **Arista**.
* **SNMP port mapping**: Scan interfaces via SNMP to auto-populate ports and active load traffic (Juniper `xe-*`, Cisco `TenGigabitEthernet*`, MikroTik `sfp-sfpplus*`).
* **Ping latency traces**: Run active ICMP ping checks to trace RTT delays.
* **SSH CLI console emulator**: Interactive console that simulates vendor-specific routing queries and shell prompts:
  * **Juniper**: Type `show route`, `show interfaces`, `help`.
  * **Cisco**: Type `show ip route`, `show ip interface brief`, `help`.
  * **MikroTik**: Type `/ip route print`, `/interface print`, `help`.

### 🚨 Real-time Alarm Management
* **Asynchronous Alarm Generator**: Periodic telemetry loop that generates realistic warnings and outages.
* **Web Audio alerts**: A synthesized warning beep triggers on critical alarms if the audio alert bell is unmuted.
* **Alarm ticker marquee**: Scrolling real-time alarms list at the bottom footer that pauses on mouse hover.
* **Severity filters**: Query and resolve logs using filter tabs (Critical, Major, Minor, Warning).

### 🛠️ Configuration & Analytics
* **CLI script templates**: Pre-configured VLAN and QoS mappings. Form inputs populate template variables dynamically.
* **Dry-run diffs**: Simulated file diff checks comparing current configurations with script parameters before deploying.
* **Reports and downloads**: Bandwidth loads, optical distributions, and alarm frequency history charts with Excel/PDF mock downloads.
* **Audit trail log**: Administrative transaction logs tracking all operator actions.
* **LocalStorage persistence**: All device databases, interfaces, configs, and logs are saved to the browser's `localStorage` to persist across refreshes.

---

## Technical Stack

* **Core**: React 18 (Hooks, Context, Memoization)
* **Styling**: Tailwind CSS 3 (Dark telco panel variables, custom CSS animations)
* **Bundler**: Vite
* **Charts**: Recharts (Custom dark tooltips and grid styling)
* **Iconography**: Lucide React

---

## Deployment & Setup

### 1. Local Development Launch
Ensure you have [Node.js](https://nodejs.org/) installed:

```bash
# Install dependencies
npm install

# Run Vite dev server (accessible at http://localhost:5173/)
npm run dev

# Compile production bundle
npm run build
```

### 2. One-Command Docker Deployment (Ubuntu Server)
To host the production-compiled static dashboard served via Nginx in a container, upload the files to your server, navigate into the directory, and run:

```bash
sudo bash deploy.sh
```

This will automatically:
1. Verify and install Docker Engine & Compose if missing.
2. Spin up the multi-stage build container.
3. Expose the dashboard on host port `80` (accessible at `http://your-server-ip:80`).

---

## Database Utilities
If you are testing the dashboard layout and want to reset or seed data, navigate to the **Settings** tab:
* **Load Telemetry Mock Data**: Seed the database with 8 OLTs, 800+ ONUs, and core Cisco/Juniper/MikroTik nodes.
* **Wipe Database (Start Clean)**: Empty all OLTs, routers, switches, alarms, and audit logs.
