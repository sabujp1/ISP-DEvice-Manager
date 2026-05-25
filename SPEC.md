# OLT Manager - Multi-Vendor NOC Dashboard

## 1. Concept & Vision

A dark, industrial telco control room aesthetic combining hacker terminal vibes with professional NOC functionality. This is the command center ISP engineers dream of—dense information displays, real-time monitoring, and instant device control. Every interaction feels precise and powerful, like piloting critical network infrastructure.

## 2. Design Language

### Aesthetic Direction
Dark industrial-utilitarian: telco control room meets hacker terminal. High information density balanced with clear visual hierarchy.

### Color Palette
```
--bg-primary: #0d1117      // Deep navy-black
--bg-secondary: #161b22    // Charcoal panels
--bg-tertiary: #21262d     // Elevated surfaces
--border: #30363d          // Subtle borders
--text-primary: #e6edf3    // High contrast text
--text-secondary: #8b949e  // Muted text
--accent-green: #00ff88    // Success, online, healthy
--accent-blue: #00aaff     // Primary actions, links
--accent-amber: #ffaa00    // Warnings
--accent-red: #ff4444      // Errors, critical alarms
--accent-purple: #a855f7   // Special highlights
```

### Typography
- **Data/Code**: JetBrains Mono (Google Fonts) - all numbers, IPs, serial numbers
- **UI/Labels**: Inter - buttons, headers, navigation
- **Fallback**: system-ui, monospace

### Spatial System
- Base unit: 4px
- Panel padding: 16px (4 units)
- Card gaps: 12px
- Section margins: 24px
- Dense data tables with 8px vertical padding per row

### Motion Philosophy
- Subtle pulse animations for live data indicators (online status)
- Smooth slide transitions for panel expansion (300ms ease-out)
- Hover states with left border accent (150ms)
- Alarm ticker: continuous horizontal scroll (40s loop)
- Chart animations: ease-in-out on data load (500ms)

### Visual Assets
- **Icons**: Lucide React (consistent stroke width)
- **Charts**: Recharts with custom dark theme
- **Decorative**: Subtle grid pattern overlay on backgrounds, scanline effect on headers

## 3. Layout & Structure

### Overall Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | Search | Notifications | User Menu          │
├──────────┬──────────────────────────────────────────────────┤
│          │  Main Content Area (tab-based navigation)       │
│ Sidebar  │  ┌─────────────────────────────────────────────┐  │
│ (nav)    │  │  Module-specific content                   │  │
│          │  │                                             │  │
│ - Dash   │  │                                             │  │
│ - OLTs   │  │                                             │  │
│ - ONUs   │  │                                             │  │
│ - Alarms │  │                                             │  │
│ - Config │  │                                             │  │
│ - Reports│  │                                             │  │
│ - Users  │  └─────────────────────────────────────────────┘  │
│ - Settings│ ┌─────────────────────────────────────────────┐ │
│          │  │  Alarm Ticker (bottom, auto-scroll)        │ │
└──────────┴──└─────────────────────────────────────────────┘─┘
```

### Responsive Strategy
- Desktop (>1200px): Full sidebar + content
- Tablet (768-1200px): Collapsed sidebar icons
- Mobile (<768px): Bottom navigation, stacked cards

## 4. Features & Interactions

### Dashboard Module
- **Stats Cards**: Click to drill down to relevant list (e.g., click "Offline OLTs" → filtered OLT list)
- **Live Feed**: 30+ realistic alarms with auto-scroll ticker
- **Charts**: Interactive - hover for tooltips, click pie slices to filter

### OLT Inventory Module
- **Table**: Sortable columns, sticky header
- **Filters**: Multi-select dropdowns for vendor, technology, status, location
- **CRUD Modal**: Form validation, password visibility toggle, port number validation (1-65535)
- **Bulk Import**: CSV template download, drag-drop upload zone, validation feedback

### OLT Detail Module
- **Header**: Click vendor badge to open vendor documentation link
- **Port Grid**: Click port to expand ONU list (accordion)
- **Power Indicators**: Color badges: 🟢 > -25dBm, 🟡 -25 to -27dBm, 🔴 < -27dBm
- **Actions**: Confirmation dialog for destructive actions (reboot, reset)

### ONU Management Module
- **Search**: Debounced (300ms) search across serial, MAC, name
- **Bulk Actions**: Checkbox selection, floating action bar appears
- **Profiles**: Slide-out panel for profile assignment

### Alarm Center Module
- **Severity Tabs**: All / Critical / Major / Minor / Warning
- **Actions**: Acknowledge (single/bulk), Clear, Export CSV
- **Audio Toggle**: Bell icon with active state indicator
- **History**: Date range picker, severity filter

### Configuration Module
- **Template Library**: Vendor-filtered template list
- **Command Editor**: Syntax highlighting simulation, diff preview
- **Apply Modal**: Target OLT selector, preview changes, confirm execution

### Reports Module
- **Date Selection**: Preset ranges (Today, 7d, 30d, Custom)
- **Export**: PDF button, Excel button
- **Charts**: Draggable time window

### User Management Module
- **Role Badges**: Color-coded (Admin: blue, Engineer: green, Viewer: gray)
- **Activity Log**: Collapsible detail rows

### Settings Module
- **Section Tabs**: System / Notifications / API / Polling
- **Test Buttons**: Send test notification, test API connection

## 5. Component Inventory

### StatCard
- States: default, loading (skeleton), interactive (hover lift + cursor)
- Contains: icon, label, value, trend indicator

### DataTable
- States: loading (skeleton rows), empty (illustration + message), error (retry button)
- Features: sortable headers (icon indicator), pagination, row selection

### StatusBadge
- Variants: online (green pulse), offline (gray), warning (amber), critical (red)
- Size: small (inline), medium (standalone)

### PowerIndicator
- Variants: good (green >-25), marginal (yellow -25 to -27), poor (red <-27)
- Shows: badge + dBm value

### Modal
- Variants: form (with inputs), confirm (with buttons), info (read-only)
- Features: backdrop blur, escape to close, focus trap

### Sidebar Navigation
- States: expanded, collapsed (icons only), mobile (bottom bar)
- Active item: left border accent + background highlight

### AlarmTicker
- Continuous scroll, severity color coding, click to navigate

### PortCard
- Shows: port number, status LED, ONU count, mini signal bars

### Charts
- All use dark theme with grid lines matching --border color
- Tooltip: dark background with --bg-tertiary

## 6. Technical Approach

### Stack
- **React 18**: Functional components, hooks
- **Tailwind CSS**: Utility classes + custom CSS variables for theme
- **Recharts**: All visualizations
- **Lucide React**: Iconography
- **Single File**: All components in one App.jsx for simplicity (with inline styles where needed)

### State Management
- React useState for local component state
- React useEffect for data simulation and timers
- Context for global state (current user, theme)

### Data Layer
- Mock data generators with realistic ISP values
- Simulated API delays (200-500ms) for loading states
- LocalStorage for user preferences and settings

### Mock Data Scale
- 8 OLTs (2 per vendor: VSOL, CDATA, BDCOM, ZTE)
- 64 PON ports (8 per OLT)
- 800+ ONUs (12-15 per port)
- 35+ active alarms (varied severity)

### Routing
- Tab-based navigation within single page
- URL hash for deep linking (#dashboard, #olts, #onus)

### Performance
- Virtualized lists for large tables (100+ rows)
- Debounced search inputs
- Memoized chart data transformations
