import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, Server, Wifi, Bell, Settings, Users, FileText,
  ChevronLeft, ChevronRight, Search, Menu, Plus, Edit2, Trash2, X,
  Check, AlertTriangle, WifiOff, RefreshCw, Download, Filter, Power,
  Eye, EyeOff, Activity, Sliders, Play, Trash, AlertCircle, CheckCircle,
  XCircle, Info, Copy, ExternalLink, Save, Volume2, VolumeX, Terminal,
  Clock, Shield, User, FileCode, CheckSquare, Square, RefreshCcw, Network, LogOut
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  olts as mockOlts, allOnus as mockOnus, allPorts as mockPorts, allAlarms as mockAlarms,
  configTemplates as initialConfigTemplates, users as initialUsers, activityLog as initialActivityLog,
  vendorDistribution as initialVendorDistribution, technologyDistribution as initialTechDistribution,
  generateHistoricalData, generateSerialNumber, generateMac
} from './data';

// ==================== CONSTANTS ====================
const COLORS = {
  green: '#00ff88',
  blue: '#00aaff',
  amber: '#ffaa00',
  red: '#ff4444',
  purple: '#a855f7',
  cyan: '#06b6d4',
  gray: '#4b5563',
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'olts', label: 'OLT Inventory', icon: Server },
  { id: 'onus', label: 'ONU Management', icon: Wifi },
  { id: 'routers', label: 'Core Infrastructure', icon: Network },
  { id: 'alarms', label: 'Alarm Center', icon: Bell },
  { id: 'config', label: 'Configuration', icon: Sliders },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'users', label: 'Users & Audit', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SEVERITY_COLORS = {
  critical: '#ff4444',
  major: '#ff8800',
  minor: '#ffaa00',
  warning: '#ffcc00',
};

// ==================== UTILITY FUNCTIONS ====================
const formatUptime = (seconds) => {
  if (!seconds) return 'Offline';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
};

const formatDate = (iso) => new Date(iso).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
});

const getPowerStatus = (rx) => {
  const power = parseFloat(rx);
  if (power > -25) return { level: 'good', color: COLORS.green };
  if (power > -27) return { level: 'marginal', color: COLORS.amber };
  return { level: 'poor', color: COLORS.red };
};

const formatUptimeDisplay = (seconds) => {
  if (!seconds) return 'Offline';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
};

// ==================== CORE COMPONENTS ====================

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-olt-panel border border-olt-border rounded-xl shadow-2xl animate-fade-in max-h-[90vh] overflow-hidden flex flex-col z-10`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-olt-border">
          <h3 className="text-lg font-semibold text-olt-text">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-olt-surface rounded-lg transition-colors">
            <X size={20} className="text-olt-muted" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

function Button({ children, variant = 'primary', size = 'md', loading, disabled, className = '', onClick, ...props }) {
  const variants = {
    primary: 'bg-olt-blue hover:bg-olt-blue/80 text-white shadow-[0_0_8px_rgba(0,170,255,0.2)]',
    secondary: 'bg-olt-surface hover:bg-olt-border border border-olt-border text-olt-text',
    danger: 'bg-olt-red hover:bg-olt-red/80 text-white shadow-[0_0_8px_rgba(255,68,68,0.2)]',
    ghost: 'hover:bg-olt-surface text-olt-muted hover:text-olt-text',
    success: 'bg-olt-green hover:bg-olt-green/80 text-olt-bg font-bold',
  };
  const sizes = {
    xs: 'px-2 py-1 text-2xs',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {loading && <RefreshCw size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

function StatusBadge({ status, pulse = false }) {
  const configs = {
    online: { bg: 'bg-olt-green/15 border border-olt-green/30', text: 'text-olt-green', label: 'Online' },
    offline: { bg: 'bg-olt-border/30 border border-olt-border', text: 'text-olt-muted', label: 'Offline' },
    warning: { bg: 'bg-olt-amber/15 border border-olt-amber/30', text: 'text-olt-amber', label: 'Warning' },
    critical: { bg: 'bg-olt-red/15 border border-olt-red/30', text: 'text-olt-red', label: 'Critical' },
    active: { bg: 'bg-olt-red/10 border border-olt-red/30', text: 'text-olt-red', label: 'Active' },
    acknowledged: { bg: 'bg-olt-blue/15 border border-olt-blue/30', text: 'text-olt-blue', label: 'Acknowledged' },
    up: { bg: 'bg-olt-green/15 border border-olt-green/30', text: 'text-olt-green', label: 'UP' },
    down: { bg: 'bg-olt-red/15 border border-olt-red/30', text: 'text-olt-red', label: 'DOWN' },
  };
  const cfg = configs[status] || configs.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {pulse && (status === 'online' || status === 'up') && (
        <span className="w-1.5 h-1.5 rounded-full bg-olt-green pulse-online" />
      )}
      {cfg.label}
    </span>
  );
}

function PowerIndicator({ rxPower }) {
  if (!rxPower || parseFloat(rxPower) === 0) return <span className="text-olt-muted">--</span>;
  const { level, color } = getPowerStatus(rxPower);
  const indicatorIcons = { good: '🟢', marginal: '🟡', poor: '🔴' };
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      <span>{indicatorIcons[level]}</span>
      <span style={{ color }} className="font-bold">{rxPower} dBm</span>
    </span>
  );
}

function StatCard({ icon: Icon, label, value, subtext, trend, color = COLORS.green, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-olt-panel border border-olt-border rounded-xl p-5 hover:border-opacity-80 transition-all ${onClick ? 'cursor-pointer hover:border-olt-blue/40 hover:-translate-y-0.5 shadow-lg' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center text-xs font-mono font-bold ${trend >= 0 ? 'text-olt-green' : 'text-olt-red'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold font-mono tracking-tight" style={{ color }}>{value}</p>
        <p className="text-sm font-semibold text-olt-text mt-1">{label}</p>
        {subtext && <p className="text-xs text-olt-muted mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

function DataTable({ columns, data, onRowClick, rowKey = 'id', emptyMessage = 'No matching records found' }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-olt-border bg-olt-panel/50">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-olt-surface/40 border-b border-olt-border text-left">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 text-xs font-semibold text-olt-muted uppercase tracking-wider ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-olt-border/30">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-olt-muted font-mono">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[rowKey]}
                onClick={() => onRowClick?.(row)}
                className={`table-row-hover ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-2.5 text-sm ${col.className || ''}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = useMemo(() => {
    const p = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        p.push(i);
      } else if (p[p.length - 1] !== '...') {
        p.push('...');
      }
    }
    return p;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 mt-4 justify-end">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        className="p-1.5 rounded-lg border border-olt-border bg-olt-panel hover:bg-olt-surface text-olt-muted disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) => (
        <button key={i} onClick={() => typeof p === 'number' && onPageChange(p)}
          disabled={p === '...'}
          className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border ${p === currentPage ? 'bg-olt-blue border-olt-blue text-white shadow-md' : 'bg-olt-panel border-olt-border hover:bg-olt-surface text-olt-muted'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg border border-olt-border bg-olt-panel hover:bg-olt-surface text-olt-muted disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function FilterBar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-olt-panel/40 border border-olt-border/60 rounded-xl">
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder, className = '' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`px-3 py-2 bg-olt-panel border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none cursor-pointer ${className}`}>
      <option value="">{placeholder || 'All'}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg ${className}`}>
      <h3 className="text-xs font-bold text-olt-muted uppercase tracking-wider mb-4 border-b border-olt-border/30 pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ==================== MAIN APP ====================
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('olt_manager_auth') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('olt_manager_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [alarmAudio, setAlarmAudio] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Database Cleared', message: 'NOC Database initialized to clean state', time: new Date().toISOString(), read: false, severity: 'info' }
  ]);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);

  // Load States from LocalStorage (DEFAULT TO EMPTY ARRAYS)
  const [oltList, setOltList] = useState(() => {
    const saved = localStorage.getItem('olt_manager_olts');
    return saved ? JSON.parse(saved) : [];
  });
  const [onuList, setOnuList] = useState(() => {
    const saved = localStorage.getItem('olt_manager_onus');
    return saved ? JSON.parse(saved) : [];
  });
  const [portsList, setPortsList] = useState(() => {
    const saved = localStorage.getItem('olt_manager_ports');
    return saved ? JSON.parse(saved) : [];
  });
  const [alarmList, setAlarmList] = useState(() => {
    const saved = localStorage.getItem('olt_manager_alarms');
    return saved ? JSON.parse(saved) : [];
  });
  const [routerList, setRouterList] = useState(() => {
    const saved = localStorage.getItem('olt_manager_routers');
    return saved ? JSON.parse(saved) : [];
  });
  const [routerInterfaces, setRouterInterfaces] = useState(() => {
    const saved = localStorage.getItem('olt_manager_router_interfaces');
    return saved ? JSON.parse(saved) : [];
  });
  const [userList, setUserList] = useState(() => {
    const saved = localStorage.getItem('olt_manager_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });
  const [activityLog, setActivityLog] = useState(() => {
    const saved = localStorage.getItem('olt_manager_activity');
    return saved ? JSON.parse(saved) : [];
  });
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('olt_manager_templates');
    return saved ? JSON.parse(saved) : initialConfigTemplates;
  });

  // Keep LocalStorage in sync
  useEffect(() => {
    localStorage.setItem('olt_manager_olts', JSON.stringify(oltList));
  }, [oltList]);

  useEffect(() => {
    localStorage.setItem('olt_manager_onus', JSON.stringify(onuList));
  }, [onuList]);

  useEffect(() => {
    localStorage.setItem('olt_manager_ports', JSON.stringify(portsList));
  }, [portsList]);

  useEffect(() => {
    localStorage.setItem('olt_manager_alarms', JSON.stringify(alarmList));
  }, [alarmList]);

  useEffect(() => {
    localStorage.setItem('olt_manager_routers', JSON.stringify(routerList));
  }, [routerList]);

  useEffect(() => {
    localStorage.setItem('olt_manager_router_interfaces', JSON.stringify(routerInterfaces));
  }, [routerInterfaces]);

  useEffect(() => {
    localStorage.setItem('olt_manager_users', JSON.stringify(userList));
  }, [userList]);

  useEffect(() => {
    localStorage.setItem('olt_manager_activity', JSON.stringify(activityLog));
  }, [activityLog]);

  // OLT Detail & UI States
  const [selectedOlt, setSelectedOlt] = useState(null);
  const [oltModalOpen, setOltModalOpen] = useState(false);
  const [oltForm, setOltForm] = useState(null);
  const [oltFilter, setOltFilter] = useState({ vendor: '', tech: '', status: '', location: '' });

  // ONU UI States
  const [onuFilter, setOnuFilter] = useState({ olt: '', status: '', power: '' });
  const [onuSearch, setOnuSearch] = useState('');
  const [selectedOnus, setSelectedOnus] = useState([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState('');

  // Router & Switch UI States
  const [selectedRouter, setSelectedRouter] = useState(null);
  const [routerModalOpen, setRouterModalOpen] = useState(false);
  const [routerForm, setRouterForm] = useState(null);
  const [routerFilter, setRouterFilter] = useState({ type: '', vendor: '', status: '' });
  const [routerSearch, setRouterSearch] = useState('');
  const [routerPage, setRouterPage] = useState(1);
  const [syncingRouterId, setSyncingRouterId] = useState(null);

  // Ping & SSH Terminal states
  const [routerPingModalOpen, setRouterPingModalOpen] = useState(false);
  const [routerPingActive, setRouterPingActive] = useState(false);
  const [routerPingResults, setRouterPingResults] = useState([]);
  const [routerConsoleModalOpen, setRouterConsoleModalOpen] = useState(false);
  const [routerConsoleLogs, setRouterConsoleLogs] = useState([]);
  const [routerConsoleInput, setRouterConsoleInput] = useState('');

  // Alarm UI States
  const [alarmFilter, setAlarmFilter] = useState({ severity: '', status: '' });
  const [alarmSearch, setAlarmSearch] = useState('');

  // Config editor state
  const [configActiveTemplate, setConfigActiveTemplate] = useState(initialConfigTemplates[0]);
  const [configCode, setConfigCode] = useState(initialConfigTemplates[0].description);
  const [configTargetOlt, setConfigTargetOlt] = useState('');
  const [configApplying, setConfigApplying] = useState(false);
  const [configProgress, setConfigProgress] = useState(0);
  const [configLogs, setConfigLogs] = useState([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configDiffModalOpen, setConfigDiffModalOpen] = useState(false);
  const [configVariables, setConfigVariables] = useState({ VLAN_ID: '100', PROFILE_NAME: 'GPON-HOME-GOLD', TARGET_IP: '10.200.1.1' });

  // Reports state
  const [reportsType, setReportsType] = useState('traffic');
  const [reportsRange, setReportsRange] = useState('7d');
  const [reportsExporting, setReportsExporting] = useState(false);

  // User management state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState(null);
  const [expandedAuditLog, setExpandedAuditLog] = useState(null);

  // SNMP scan state
  const [syncingOltId, setSyncingOltId] = useState(null);
  const [snmpPollModalOpen, setSnmpPollModalOpen] = useState(false);
  const [snmpPollTitle, setSnmpPollTitle] = useState('');
  const [snmpPollProgress, setSnmpPollProgress] = useState(0);
  const [snmpPollLogs, setSnmpPollLogs] = useState([]);
  const [snmpPollApplying, setSnmpPollApplying] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    snmpPort: 161,
    snmpCommunity: 'public',
    telegramBot: '748293910:AAFi93jK0wLsaM923kd',
    telegramChatId: '-10023491023',
    emailAlerts: true,
    pollingInterval: 60,
    audioAlerts: false,
  });

  // Pagination states
  const [oltPage, setOltPage] = useState(1);
  const [onuPage, setOnuPage] = useState(1);
  const [alarmPage, setAlarmPage] = useState(1);
  const pageSize = 10;

  // Visual terminal references
  const consoleBottomRef = useRef(null);
  const routerConsoleBottomRef = useRef(null);
  const snmpConsoleBottomRef = useRef(null);

  // ==================== TOAST & BEEP HELPERS ====================
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const playSynthesizedBeep = (severity) => {
    if (!alarmAudio) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const isCritical = severity === 'critical';
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(isCritical ? 880 : 440, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, isCritical ? 250 : 150);
    } catch (e) {
      console.warn("Synthesized audio beep failed:", e);
    }
  };

  // ==================== SIMULATED REAL-TIME ALARM GENERATOR ====================
  useEffect(() => {
    if (oltList.length === 0 && routerList.length === 0) return;

    const timer = setInterval(() => {
      if (Math.random() > 0.15) return;

      const activeOlts = oltList.filter(o => o.status !== 'offline');
      if (activeOlts.length === 0) return;

      const randomOlt = activeOlts[Math.floor(Math.random() * activeOlts.length)];
      const alarmTypes = [
        { type: 'ONU_OFFLINE', severity: 'major', description: 'ONU has gone offline unexpectedly' },
        { type: 'LOW_RX_POWER', severity: 'minor', description: 'Optical receive power below threshold (-28.4 dBm)' },
        { type: 'LOS', severity: 'critical', description: 'Loss of signal detected on fiber strand' },
        { type: 'HIGH_TEMP', severity: 'warning', description: 'Device core temperature exceeds 80°C threshold' },
        { type: 'PORT_DOWN', severity: 'major', description: 'PON Port 4 hardware interface down' },
      ];

      const chosenAlarm = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];
      const portNum = Math.floor(Math.random() * randomOlt.portCount) + 1;
      const portOnus = onuList.filter(o => o.oltId === randomOlt.id && o.port === portNum);
      const chosenOnu = portOnus[Math.floor(Math.random() * portOnus.length)];

      const newAlarm = {
        id: Date.now(),
        time: new Date().toISOString(),
        oltId: randomOlt.id,
        oltName: randomOlt.name,
        oltIp: randomOlt.ip,
        port: portNum,
        onuSn: chosenOnu?.serialNumber || null,
        onuName: chosenOnu?.name || null,
        alarmType: chosenAlarm.type,
        description: chosenAlarm.description,
        severity: chosenAlarm.severity,
        status: 'active'
      };

      // Play Beep & Update States
      playSynthesizedBeep(newAlarm.severity);
      setAlarmList(prev => [newAlarm, ...prev]);

      // Add to notifications
      const newNotif = {
        id: Date.now(),
        title: `Alarm Triggered on ${newAlarm.oltName}`,
        message: `${newAlarm.alarmType}: ${newAlarm.description}`,
        time: new Date().toISOString(),
        read: false,
        severity: newAlarm.severity
      };
      setNotifications(prev => [newNotif, ...prev]);
      addToast(`New ${newAlarm.severity.toUpperCase()} alarm on ${newAlarm.oltName}`, 'danger');

      // Update OLT alarm counts
      setOltList(prev => prev.map(o => o.id === randomOlt.id ? { ...o, alarmCount: o.alarmCount + 1 } : o));

      // Update activity log
      const auditLog = {
        id: Date.now() + 1,
        timestamp: new Date().toISOString(),
        user: 'SYSTEM',
        action: 'Alarm Registered',
        detail: `${newAlarm.alarmType} generated automatically for OLT ${newAlarm.oltName}`
      };
      setActivityLog(prev => [auditLog, ...prev]);

    }, 20000);

    return () => clearInterval(timer);
  }, [oltList, onuList, alarmAudio]);

  // ==================== MEMOIZED DATA SELECTORS ====================
  const filteredOlts = useMemo(() => {
    return oltList.filter(olt => {
      if (oltFilter.vendor && olt.vendor !== oltFilter.vendor) return false;
      if (oltFilter.tech && olt.technology !== oltFilter.tech) return false;
      if (oltFilter.status && olt.status !== oltFilter.status) return false;
      if (oltFilter.location && olt.location !== oltFilter.location) return false;
      if (searchQuery && activeTab === 'olts') {
        const q = searchQuery.toLowerCase();
        return olt.name.toLowerCase().includes(q) || olt.ip.includes(q) || olt.model.toLowerCase().includes(q);
      }
      return true;
    });
  }, [oltList, oltFilter, searchQuery, activeTab]);

  const filteredOnus = useMemo(() => {
    return onuList.filter(onu => {
      if (onuFilter.olt && `olt-${onu.oltId}` !== onuFilter.olt) return false;
      if (onuFilter.status && onu.status !== onuFilter.status) return false;
      if (onuFilter.power) {
        const power = parseFloat(onu.rxPower);
        if (onuFilter.power === 'good' && power <= -25) return false;
        if (onuFilter.power === 'marginal' && (power > -25 || power <= -27)) return false;
        if (onuFilter.power === 'poor' && power > -27) return false;
      }
      if (onuSearch) {
        const q = onuSearch.toLowerCase();
        return onu.serialNumber.toLowerCase().includes(q) ||
               onu.mac.toLowerCase().includes(q) ||
               onu.name.toLowerCase().includes(q) ||
               onu.model.toLowerCase().includes(q);
      }
      return true;
    });
  }, [onuList, onuFilter, onuSearch]);

  const filteredRouters = useMemo(() => {
    return routerList.filter(router => {
      if (routerFilter.type && router.deviceType !== routerFilter.type) return false;
      if (routerFilter.vendor && router.vendor !== routerFilter.vendor) return false;
      if (routerFilter.status && router.status !== routerFilter.status) return false;
      if (routerSearch) {
        const q = routerSearch.toLowerCase();
        return router.name.toLowerCase().includes(q) || router.ip.includes(q) || router.model.toLowerCase().includes(q);
      }
      return true;
    });
  }, [routerList, routerFilter, routerSearch]);

  const filteredAlarms = useMemo(() => {
    return alarmList.filter(alarm => {
      if (alarmFilter.severity && alarm.severity !== alarmFilter.severity) return false;
      if (alarmFilter.status && alarm.status !== alarmFilter.status) return false;
      if (alarmSearch) {
        const q = alarmSearch.toLowerCase();
        return alarm.oltName.toLowerCase().includes(q) ||
               alarm.alarmType.toLowerCase().includes(q) ||
               (alarm.onuSn && alarm.onuSn.toLowerCase().includes(q)) ||
               alarm.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [alarmList, alarmFilter, alarmSearch]);

  // Paginated Slices
  const paginatedOlts = useMemo(() => {
    const start = (oltPage - 1) * pageSize;
    return filteredOlts.slice(start, start + pageSize);
  }, [filteredOlts, oltPage]);

  const paginatedOnus = useMemo(() => {
    const start = (onuPage - 1) * pageSize;
    return filteredOnus.slice(start, start + pageSize);
  }, [filteredOnus, onuPage]);

  const paginatedRouters = useMemo(() => {
    const start = (routerPage - 1) * pageSize;
    return filteredRouters.slice(start, start + pageSize);
  }, [filteredRouters, routerPage]);

  const paginatedAlarms = useMemo(() => {
    const start = (alarmPage - 1) * pageSize;
    return filteredAlarms.slice(start, start + pageSize);
  }, [filteredAlarms, alarmPage]);

  // Recalculated dynamic stats for dashboard
  const dynamicStats = useMemo(() => {
    return {
      totalOlts: oltList.length,
      onlineOlts: oltList.filter(o => o.status === 'online').length,
      offlineOlts: oltList.filter(o => o.status === 'offline').length,
      totalOnus: onuList.length,
      onlineOnus: onuList.filter(o => o.status === 'online').length,
      activeAlarms: alarmList.filter(a => a.status === 'active').length,
      criticalAlarms: alarmList.filter(a => a.severity === 'critical' && a.status === 'active').length,
      totalRouters: routerList.length,
      onlineRouters: routerList.filter(r => r.status === 'online').length,
    };
  }, [oltList, onuList, alarmList, routerList]);

  // Dynamic Chart calculations based on actual OLTs & Routers in memory
  const dynamicVendorDistribution = useMemo(() => {
    const dist = {};
    oltList.forEach(o => { dist[o.vendor] = (dist[o.vendor] || 0) + 1; });
    routerList.forEach(r => { dist[r.vendor] = (dist[r.vendor] || 0) + 1; });
    return Object.keys(dist).map(k => ({ vendor: k, count: dist[k] }));
  }, [oltList, routerList]);

  const dynamicTechDistribution = useMemo(() => {
    const dist = {};
    oltList.forEach(o => { dist[o.technology] = (dist[o.technology] || 0) + 1; });
    routerList.forEach(r => { dist[r.deviceType.toUpperCase()] = (dist[r.deviceType.toUpperCase()] || 0) + 1; });
    return Object.keys(dist).map(k => ({ technology: k, count: dist[k] }));
  }, [oltList, routerList]);

  // Chart generators
  const [onuHistory] = useState(() => generateHistoricalData('onu'));
  const [trafficHistory] = useState(() => generateHistoricalData('traffic'));
  const alarmTimelineData = useMemo(() => generateHistoricalData('alarms'), []);

  // ==================== OLT CRUD ACTIONS ====================
  const openAddOlt = () => {
    if (!checkPermission('Add OLT Chassis', 'engineer')) return;
    setOltForm({ name: '', ip: '', port: 23, community: 'public', username: '', password: '', vendor: 'VSOL', technology: 'GPON', model: 'V2808', location: 'DC-Core-01', notes: '' });
    setOltModalOpen(true);
  };

  const openEditOlt = (olt) => {
    if (!checkPermission('Edit OLT Chassis', 'engineer')) return;
    setOltForm({ ...olt });
    setOltModalOpen(true);
  };

  const saveOlt = () => {
    if (!checkPermission('Save OLT Chassis', 'engineer')) return;
    if (!oltForm.name || !oltForm.ip) {
      addToast('Please fill out all required fields.', 'danger');
      return;
    }
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(oltForm.ip)) {
      addToast('Please enter a valid IP address.', 'danger');
      return;
    }

    if (oltForm.id) {
      setOltList(prev => prev.map(o => o.id === oltForm.id ? oltForm : o));
      addToast(`OLT ${oltForm.name} updated successfully`, 'success');
      logActivity('OLT Updated', `Modified configurations for ${oltForm.name}`);
    } else {
      const newOltId = Date.now();
      const newOlt = {
        ...oltForm,
        id: newOltId,
        status: 'online',
        uptime: 3600 * Math.floor(Math.random() * 24 + 1),
        onuCount: 0,
        alarmCount: 0,
        portCount: 8,
        cpu: 15,
        memory: 30
      };

      // Generate empty ports config
      const newPorts = {
        oltId: newOltId,
        oltName: newOlt.name,
        ports: Array.from({ length: 8 }, (_, i) => ({
          id: `${newOltId}-${i + 1}`,
          portNumber: i + 1,
          status: 'up',
          onuCount: 0,
          rxPower: null,
          txPower: '1.50',
          bandwidth: 0
        }))
      };

      setOltList(prev => [...prev, newOlt]);
      setPortsList(prev => [...prev, newPorts]);

      addToast(`OLT ${newOlt.name} added to NOC inventory`, 'success');
      logActivity('OLT Added', `Provisioned new multi-vendor OLT node: ${newOlt.name}`);

      // Automatically trigger SNMP polling scan
      syncOnusViaSnmp(newOltId, newOlt);
    }
    setOltModalOpen(false);
  };

  const deleteOlt = (id) => {
    if (!checkPermission('Delete OLT Chassis', 'engineer')) return;
    const oltName = oltList.find(o => o.id === id)?.name || 'OLT';
    if (confirm(`Are you sure you want to delete ${oltName} from inventory? This will remove all associated ONU stats.`)) {
      setOltList(prev => prev.filter(o => o.id !== id));
      setOnuList(prev => prev.filter(onu => onu.oltId !== id));
      setPortsList(prev => prev.filter(p => p.oltId !== id));
      setAlarmList(prev => prev.filter(alarm => alarm.oltId !== id));
      addToast(`OLT ${oltName} removed.`, 'success');
      logActivity('OLT Deleted', `Deleted ${oltName} node from telemetry inventory`);
      if (selectedOlt?.id === id) setSelectedOlt(null);
    }
  };

  // ==================== SNMP ONU SCANNER (DYNAMIC DISCOVERY) ====================
  const syncOnusViaSnmp = (oltId, newOltObj = null) => {
    if (!checkPermission('Sync SNMP ONUs', 'engineer')) return;
    const targetOlt = newOltObj || oltList.find(o => o.id === oltId);
    if (!targetOlt) return;

    setSnmpPollTitle(`SNMP Telemetry Polling: ${targetOlt.name} (${targetOlt.ip})`);
    setSnmpPollProgress(0);
    setSnmpPollLogs([]);
    setSnmpPollModalOpen(true);
    setSnmpPollApplying(true);

    const vendorMibOids = {
      VSOL: '1.3.6.1.4.1.37949',
      CDATA: '1.3.6.1.4.1.34592',
      BDCOM: '1.3.6.1.4.1.5504',
      ZTE: '1.3.6.1.4.1.3902',
      Huawei: '1.3.6.1.4.1.2011',
      Nokia: '1.3.6.1.4.1.637'
    };

    const enterpriseMib = vendorMibOids[targetOlt.vendor] || '1.3.6.1.4.1.9999';

    const steps = [
      { prg: 5, log: `[SNMP Client] Opening UDP connection to SNMP agent at ${targetOlt.ip}:${settings.snmpPort || 161}...` },
      { prg: 15, log: `[SNMP Client] Sent SNMP GET request (v2c, community: "${targetOlt.community || 'public'}") for sysDescr (1.3.6.1.2.1.1.1.0)...` },
      { prg: 25, log: `[SNMP Client] sysDescr Response: ${targetOlt.vendor} ${targetOlt.model || 'Chassis'} - Software Version 4.2.1-Build-9082` },
      { prg: 35, log: `[SNMP Client] Walking PON physical interface indexes (1.3.6.1.2.1.2.2.1.1)...` },
      { prg: 45, log: `[SNMP Client] Discovered ${targetOlt.portCount || 8} active PON ports mapping OID index 1001-1008.` },
      { prg: 60, log: `[SNMP Client] Walk Enterprise MIB for ONU registration list (${enterpriseMib}.3.1.2)...` },
      { prg: 75, log: `[SNMP Client] Found registered customer ONUs on PON interfaces. Reading ONU serial numbers & MAC addresses...` },
      { prg: 90, log: `[SNMP Client] Pulling ONU optical power levels (1.3.6.1.4.1.2011.2.3.1.2.1.1.9) and distance vectors...` },
      { prg: 100, log: `[SNMP Client] Walk complete. Successfully registered and mapped telemetry entries in active database registry.` }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setSnmpPollProgress(step.prg);
        setSnmpPollLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step.log}`]);
        if (step.prg === 100) {
          setSnmpPollApplying(false);

          // Generate 25-40 ONUs
          const minOnus = 25;
          const maxOnus = 40;
          const onuCount = Math.floor(Math.random() * (maxOnus - minOnus + 1)) + minOnus;

          const onuModels = {
            VSOL: ['HM820', 'HM840', 'V2801', 'V2804'],
            CDATA: ['FD601', 'FD701', 'FD801', 'OD-810'],
            BDCOM: ['EP1110', 'EP2204', 'GP2608', 'GP2616'],
            ZTE: ['F660', 'F660A', 'F680', 'ZXHN'],
            Huawei: ['HG8245', 'HG8546', 'EG8145', 'EchoLife'],
            Nokia: ['G-240G', 'G-240W', 'G-010G'],
          };
          const models = onuModels[targetOlt.vendor] || ['Generic-ONU'];

          const newOnus = Array.from({ length: onuCount }, (_, idx) => {
            const port = Math.floor(idx / 5) + 1; // spread across ports
            const onuId = (idx % 5) + 1;
            const rxPower = -16 - Math.random() * 9; // -16 to -25 dBm
            return {
              id: `${targetOlt.id}-${port}-${onuId}`,
              oltId: targetOlt.id,
              port,
              onuId,
              serialNumber: generateSerialNumber(),
              mac: generateMac(),
              name: `ONT-${targetOlt.name}-${port}${onuId.toString().padStart(2, '0')}`,
              model: models[Math.floor(Math.random() * models.length)],
              status: Math.random() > 0.05 ? 'online' : 'offline',
              rxPower: rxPower.toFixed(2),
              txPower: (1.5 + Math.random()).toFixed(2),
              distance: Math.floor(rxPower * -10 + Math.random() * 50),
              registeredAt: new Date(Date.now() - Math.random() * 86400000 * 10).toISOString(),
              lastActivity: new Date().toISOString(),
            };
          });

          // Generate physical ports configurations matching the portCount
          const updatedPorts = Array.from({ length: targetOlt.portCount || 8 }, (_, i) => {
            const portNum = i + 1;
            const portOnus = newOnus.filter(o => o.port === portNum);
            const status = portOnus.some(o => o.status === 'online') ? 'up' : 'down';
            return {
              id: `${targetOlt.id}-${portNum}`,
              portNumber: portNum,
              status,
              onuCount: portOnus.length,
              rxPower: status === 'up' ? (-20 - Math.random() * 5).toFixed(2) : null,
              txPower: '1.50',
              bandwidth: status === 'up' ? Math.floor(Math.random() * 40) + 20 : 0
            };
          });

          setPortsList(prev => [...prev.filter(p => p.oltId !== targetOlt.id), { oltId: targetOlt.id, oltName: targetOlt.name, ports: updatedPorts }]);
          setOnuList(prev => [...prev.filter(o => o.oltId !== targetOlt.id), ...newOnus]);
          setOltList(prev => prev.map(o => o.id === targetOlt.id ? { ...o, onuCount: newOnus.length } : o));

          // If detail view is open and it's the current selected OLT, update selectedOlt
          if (selectedOlt && selectedOlt.id === targetOlt.id) {
            setSelectedOlt(prev => ({ ...prev, onuCount: newOnus.length }));
          }

          addToast(`Successfully discovered ${newOnus.length} active ONUs via SNMP.`, 'success');
          logActivity('SNMP Sync Complete', `Polled OLT ${targetOlt.name} and auto-discovered ${newOnus.length} active ONUs`);
        }
      }, (idx + 1) * 350);
    });
  };

  // ==================== ROUTERS & SWITCHES ACTIONS ====================
  const openAddRouter = () => {
    if (!checkPermission('Add Core Infrastructure Device', 'engineer')) return;
    setRouterForm({ name: '', ip: '', port: 22, community: 'public', username: 'admin', password: '', vendor: 'Juniper', deviceType: 'router', model: 'MX204', location: 'DC-Core-01', notes: '' });
    setRouterModalOpen(true);
  };

  const openEditRouter = (router) => {
    if (!checkPermission('Edit Core Infrastructure Device', 'engineer')) return;
    setRouterForm({ ...router });
    setRouterModalOpen(true);
  };

  const saveRouter = () => {
    if (!checkPermission('Save Core Infrastructure Device', 'engineer')) return;
    if (!routerForm.name || !routerForm.ip) {
      addToast('Please fill out all required fields.', 'danger');
      return;
    }
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(routerForm.ip)) {
      addToast('Please enter a valid IP address.', 'danger');
      return;
    }

    if (routerForm.id) {
      setRouterList(prev => prev.map(r => r.id === routerForm.id ? routerForm : r));
      addToast(`Device ${routerForm.name} configuration updated.`, 'success');
      logActivity('Core Device Updated', `Updated metadata configurations for router: ${routerForm.name}`);
    } else {
      const newRouterId = Date.now();
      const newRouter = {
        ...routerForm,
        id: newRouterId,
        status: 'online',
        uptime: 3600 * Math.floor(Math.random() * 12 + 1),
        cpu: 10,
        memory: 20,
        temp: 35,
        interfacesCount: 0
      };

      setRouterList(prev => [...prev, newRouter]);
      addToast(`Registered Core Device: ${newRouter.name}`, 'success');
      logActivity('Core Device Provisioned', `Added new core chassis ${newRouter.name} (${newRouter.vendor}) to monitoring`);

      // Automatically trigger SNMP polling scan
      syncRouterInterfaces(newRouterId, newRouter);
    }
    setRouterModalOpen(false);
  };

  const deleteRouter = (id) => {
    if (!checkPermission('Delete Core Infrastructure Device', 'engineer')) return;
    const routerName = routerList.find(r => r.id === id)?.name || 'Device';
    if (confirm(`Remove core device ${routerName} from inventory? All scanned interface records will be wiped.`)) {
      setRouterList(prev => prev.filter(r => r.id !== id));
      setRouterInterfaces(prev => prev.filter(i => i.deviceId !== id));
      addToast(`Core Device ${routerName} deleted.`, 'success');
      logActivity('Core Device Removed', `Deleted core routing node: ${routerName}`);
      if (selectedRouter?.id === id) setSelectedRouter(null);
    }
  };

  // ==================== SNMP INTERFACE SCANNER ====================
  const syncRouterInterfaces = (routerId, newRouterObj = null) => {
    if (!checkPermission('Sync Core Interfaces via SNMP', 'engineer')) return;
    const router = newRouterObj || routerList.find(r => r.id === routerId);
    if (!router) return;

    setSnmpPollTitle(`SNMP Interface Ingestion: ${router.name} (${router.ip})`);
    setSnmpPollProgress(0);
    setSnmpPollLogs([]);
    setSnmpPollModalOpen(true);
    setSnmpPollApplying(true);

    const steps = [
      { prg: 5, log: `[SNMP Client] Establishing UDP session to SNMP agent at ${router.ip}:${settings.snmpPort || 161}...` },
      { prg: 15, log: `[SNMP Client] Sent SNMP GET request for sysDescr (1.3.6.1.2.1.1.1.0)...` },
      { prg: 25, log: `[SNMP Client] Response: ${router.vendor} ${router.model || 'Chassis'} - OS Version 12.3R1.5` },
      { prg: 40, log: `[SNMP Client] Walk OID ifTable (1.3.6.1.2.1.2.2.1) for index mappings...` },
      { prg: 60, log: `[SNMP Client] Querying interface names and administrative states...` },
      { prg: 80, log: `[SNMP Client] Querying link speeds and operational status counters...` },
      { prg: 95, log: `[SNMP Client] Reading interface traffic metrics and octets...` },
      { prg: 100, log: `[SNMP Client] Interface scan complete. Successfully registered and mapped interface entries.` }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setSnmpPollProgress(step.prg);
        setSnmpPollLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step.log}`]);
        if (step.prg === 100) {
          setSnmpPollApplying(false);

          let interfaces = [];
          if (router.vendor === 'Juniper') {
            interfaces = [
              { name: 'xe-0/0/0', desc: 'Transit Uplink (Primary)', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 3800 + Math.floor(Math.random() * 500), txMbps: 1200 + Math.floor(Math.random() * 300) },
              { name: 'xe-0/0/1', desc: 'Trunk to Core OLTs', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 900 + Math.floor(Math.random() * 200), txMbps: 2900 + Math.floor(Math.random() * 400) },
              { name: 'xe-0/0/2', desc: 'Redundant Ring Loop DC2', speed: '10Gbps', admin: 'up', oper: 'down', rxMbps: 0, txMbps: 0 },
              { name: 'ge-0/1/0', desc: 'OOB Out of Band Mgmt', speed: '1Gbps', admin: 'up', oper: 'up', rxMbps: 2, txMbps: 4 },
              { name: 'et-0/0/4', desc: '100G Backbone Ring To DC1', speed: '100Gbps', admin: 'up', oper: 'up', rxMbps: 24500 + Math.floor(Math.random() * 2000), txMbps: 18200 + Math.floor(Math.random() * 1500) },
              { name: 'xe-0/0/3', desc: 'Local CDN cache aggregates', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 4200 + Math.floor(Math.random() * 400), txMbps: 6800 + Math.floor(Math.random() * 600) }
            ];
          } else if (router.vendor === 'Cisco') {
            interfaces = [
              { name: 'GigabitEthernet1/0/1', desc: 'Admin Console Connection', speed: '1Gbps', admin: 'up', oper: 'up', rxMbps: 3, txMbps: 6 },
              { name: 'TenGigabitEthernet1/1/1', desc: 'L3 Uplink to BGP Edge', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 2100 + Math.floor(Math.random() * 300), txMbps: 1800 + Math.floor(Math.random() * 300) },
              { name: 'TenGigabitEthernet1/1/2', desc: 'OLT Distribution Link', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 1100 + Math.floor(Math.random() * 200), txMbps: 2500 + Math.floor(Math.random() * 300) },
              { name: 'TenGigabitEthernet1/1/3', desc: 'Backup Port (Disconnected)', speed: '10Gbps', admin: 'up', oper: 'down', rxMbps: 0, txMbps: 0 },
              { name: 'TenGigabitEthernet1/1/4', desc: 'Aggregation loop for POP distribution', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 4800 + Math.floor(Math.random() * 600), txMbps: 3900 + Math.floor(Math.random() * 500) }
            ];
          } else {
            // MikroTik or others
            interfaces = [
              { name: 'sfp-sfpplus1', desc: 'Master Uplink to xe-0/0/1', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 2800 + Math.floor(Math.random() * 400), txMbps: 900 + Math.floor(Math.random() * 200) },
              { name: 'sfp-sfpplus2', desc: 'Aggregation Ring Link', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 1400 + Math.floor(Math.random() * 200), txMbps: 1400 + Math.floor(Math.random() * 200) },
              { name: 'ether1', desc: 'Management Copper SFP', speed: '1Gbps', admin: 'up', oper: 'up', rxMbps: 1, txMbps: 3 },
              { name: 'ether2', desc: 'Local DHCP Server Interface', speed: '1Gbps', admin: 'up', oper: 'down', rxMbps: 0, txMbps: 0 },
              { name: 'ether3', desc: 'Unused Trunk line', speed: '1Gbps', admin: 'down', oper: 'down', rxMbps: 0, txMbps: 0 },
              { name: 'ether4', desc: 'Backup Agg Loop', speed: '1Gbps', admin: 'up', oper: 'up', rxMbps: 120 + Math.floor(Math.random() * 20), txMbps: 450 + Math.floor(Math.random() * 50) }
            ];
          }

          const updatedRecord = {
            deviceId: router.id,
            interfaces
          };

          setRouterInterfaces(prev => [...prev.filter(i => i.deviceId !== router.id), updatedRecord]);
          setRouterList(prev => prev.map(r => r.id === router.id ? { ...r, interfacesCount: interfaces.length } : r));

          if (selectedRouter && selectedRouter.id === router.id) {
            setSelectedRouter(prev => ({ ...prev, interfacesCount: interfaces.length }));
          }

          addToast(`Discovered and registered ${interfaces.length} port interfaces.`, 'success');
          logActivity('SNMP Interface Sync', `Queried core interfaces for router/switch: ${router.name}`);
        }
      }, (idx + 1) * 350);
    });
  };

  // ==================== INTERACTIVE PING TEST ====================
  const runPingTest = (router) => {
    setRouterPingModalOpen(true);
    setRouterPingActive(true);
    setRouterPingResults([`Starting Ping Check to core host at ${router.ip}...`]);

    const delayPing = (seq, rtt) => {
      return new Promise(resolve => {
        setTimeout(() => {
          setRouterPingResults(prev => [...prev, `64 bytes from ${router.ip}: seq=${seq} ttl=56 time=${rtt.toFixed(2)} ms`]);
          resolve();
        }, 500);
      });
    };

    setTimeout(async () => {
      await delayPing(0, 1.25 + Math.random() * 2);
      await delayPing(1, 1.10 + Math.random() * 2);
      await delayPing(2, 1.45 + Math.random() * 2);
      await delayPing(3, 1.05 + Math.random() * 2);
      
      setTimeout(() => {
        setRouterPingResults(prev => [
          ...prev,
          `--- ${router.ip} ping statistics ---`,
          `4 packets transmitted, 4 packets received, 0% packet loss`,
          `round-trip min/avg/max = 1.05/1.26/3.45 ms`
        ]);
        setRouterPingActive(false);
      }, 300);
    }, 500);
  };

  // ==================== SSH CLI TERMINAL CONSOLE EMULATOR ====================
  const openConsoleShell = (router) => {
    if (!checkPermission('Open SSH CLI Shell', 'engineer')) return;
    setRouterConsoleLogs([
      `[Connecting to administrative shell ${router.ip} on port 22...]`,
      `[Encrypted connection established via SSH-2.0-OpenSSH_8.0]`,
      `[Authenticating user "admin" with publickey...]`,
      `[User authenticated. Access level: Administrator]`,
      `[Last login: ${new Date(Date.now() - 3600000).toLocaleString()}]`,
      `Type 'help' or '?' for listings of available commands.`,
      ``
    ]);
    setRouterConsoleModalOpen(true);
  };

  const handleRouterConsoleSubmit = (router, command) => {
    const trimmedCmd = command.trim();
    if (!trimmedCmd) return;

    const promptChar = router.vendor === 'Juniper' ? '>' : router.vendor === 'Cisco' ? '#' : '] >';
    const fullPrompt = router.vendor === 'MikroTik' 
      ? `[admin@${router.name}${promptChar}`
      : `${router.name}${promptChar}`;

    setRouterConsoleLogs(prev => [...prev, `${fullPrompt} ${trimmedCmd}`]);

    // Delay command response
    setTimeout(() => {
      let response = [];
      const lowerCmd = trimmedCmd.toLowerCase();

      if (lowerCmd === 'help' || lowerCmd === '?') {
        if (router.vendor === 'Juniper') {
          response = [
            'Possible completions:',
            '  clear                Clear screen information',
            '  show route           Show IP routing table',
            '  show interfaces      Show interfaces terse brief',
            '  ping <host>          Ping destination IP address',
            '  exit                 Exit administrative CLI shell'
          ];
        } else if (router.vendor === 'Cisco') {
          response = [
            'Exec commands:',
            '  clear                Reset CLI console screen',
            '  show ip route        Show IP routing table',
            '  show ip interface    Show IP interfaces brief summary',
            '  ping <host>          Transmit echo check packets',
            '  exit                 Exit administrative CLI shell'
          ];
        } else {
          response = [
            'MikroTik v7.x RouterOS Command Console:',
            '  /ip route print      Show IP routing table',
            '  /interface print     Show physical ports details',
            '  /ping address=<ip>   Ping remote destination',
            '  clear                Clear terminal screen',
            '  exit                 Exit administrative CLI shell'
          ];
        }
      } else if (lowerCmd.includes('ping')) {
        const dest = lowerCmd.split(' ').pop() || '10.0.0.1';
        response = [
          `PING ${dest} (${dest}): 56 data bytes`,
          `64 bytes from ${dest}: icmp_seq=0 ttl=64 time=1.24 ms`,
          `64 bytes from ${dest}: icmp_seq=1 ttl=64 time=1.89 ms`,
          `64 bytes from ${dest}: icmp_seq=2 ttl=64 time=1.12 ms`,
          `--- ${dest} ping statistics ---`,
          `3 packets transmitted, 3 packets received, 0% packet loss`,
          `round-trip min/avg/max = 1.12/1.41/1.89 ms`
        ];
      } else if (lowerCmd.includes('route')) {
        if (router.vendor === 'Juniper') {
          response = [
            'inet.0: 3 destinations, 3 routes (3 active, 0 holddown, 0 hidden)',
            '+ = Active Route, - = Last Active Route, * = Both',
            '',
            `0.0.0.0/0          *[Static/5] 2w1d 15:44:12`,
            `                    > to 103.54.120.1 via xe-0/0/0.0`,
            `10.100.1.0/24      *[Direct/0] 2w1d 15:44:12`,
            `                    > via xe-0/0/1.0`,
            `10.100.1.254/32    *[Local/0] 2w1d 15:44:12`,
            `                    > via lo0.0`
          ];
        } else if (router.vendor === 'Cisco') {
          response = [
            'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
            '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
            '',
            'Gateway of last resort is 10.0.0.1 to network 0.0.0.0',
            '',
            'S*    0.0.0.0/0 [1/0] via 10.0.0.1, TenGigabitEthernet1/1/1',
            'C     10.100.1.0/24 is directly connected, GigabitEthernet1/0/1',
            'L     10.100.1.254/32 is directly connected, GigabitEthernet1/0/1'
          ];
        } else {
          response = [
            'Flags: D - dynamic, X - disabled, A - active, C - connect, S - static',
            '#      DST-ADDRESS        PREF-SRC        GATEWAY            DISTANCE',
            '0  AS  0.0.0.0/0                          10.0.0.1                  1',
            '1  ADC 10.100.1.0/24      10.100.1.254    sfp-sfpplus1              0'
          ];
        }
      } else if (lowerCmd.includes('interface') || lowerCmd.includes('int brief') || lowerCmd.includes('terse')) {
        if (router.vendor === 'Juniper') {
          response = [
            'Interface               Admin Link Proto    Local                 Remote',
            'xe-0/0/0                up    up   inet     103.54.120.2/30',
            'xe-0/0/1                up    up   inet     10.100.1.254/24',
            'xe-0/0/2                up    up   inet     10.200.2.1/30',
            'ge-0/1/0                up    down'
          ];
        } else if (router.vendor === 'Cisco') {
          response = [
            'Interface              IP-Address      OK? Method Status                Protocol',
            'GigabitEthernet1/0/1   10.100.1.254    YES manual up                    up',
            'TenGigabitEthernet1/1  10.0.0.2        YES manual up                    up',
            'TenGigabitEthernet1/2  unassigned      YES unset  down                  down'
          ];
        } else {
          response = [
            'Flags: X - disabled, R - running, S - slave',
            ' #     NAME                                TYPE         ACTUAL-MTU L2MTU',
            ' 0  R  ether1                              ether              1500  1598',
            ' 1  R  sfp-sfpplus1                        xether             1500  1598',
            ' 2     sfp-sfpplus2                        xether             1500  1598'
          ];
        }
      } else if (lowerCmd === 'clear') {
        setRouterConsoleLogs([]);
        return;
      } else if (lowerCmd === 'exit') {
        setRouterConsoleModalOpen(false);
        return;
      } else {
        response = [
          `Error: Command "${trimmedCmd}" not recognized or unsupported in simulation.`,
          'Type "help" or "?" to display lists of available simulated commands.'
        ];
      }

      setRouterConsoleLogs(prev => [...prev, ...response]);
    }, 450);

    setRouterConsoleInput('');
  };

  useEffect(() => {
    if (routerConsoleBottomRef.current) {
      routerConsoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [routerConsoleLogs]);

  useEffect(() => {
    if (snmpConsoleBottomRef.current) {
      snmpConsoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [snmpPollLogs]);

  // ==================== ALARM ACTIONS ====================
  const acknowledgeAlarm = (id) => {
    setAlarmList(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
    addToast('Alarm marked as acknowledged.', 'success');
    logActivity('Alarm Acknowledged', `Acknowledged active network alert ID: ${id}`);
  };

  const acknowledgeAll = () => {
    setAlarmList(prev => prev.map(a => a.status === 'active' ? { ...a, status: 'acknowledged' } : a));
    addToast('All active alarms acknowledged.', 'success');
    logActivity('Bulk Alarm Acknowledge', 'Acknowledged all active alarms in Alarm Center');
  };

  const clearAlarm = (id) => {
    const alarm = alarmList.find(a => a.id === id);
    setAlarmList(prev => prev.filter(a => a.id !== id));
    if (alarm) {
      setOltList(prev => prev.map(o => o.id === alarm.oltId ? { ...o, alarmCount: Math.max(0, o.alarmCount - 1) } : o));
    }
    addToast('Alarm cleared from active list.', 'success');
    logActivity('Alarm Cleared', `Manually cleared alarm ID: ${id}`);
  };

  // ==================== ONU ACTIONS ====================
  const toggleOnuSelection = (onuId) => {
    setSelectedOnus(prev => prev.includes(onuId) ? prev.filter(id => id !== onuId) : [...prev, onuId]);
  };

  const toggleSelectAllOnus = () => {
    const paginatedIds = paginatedOnus.map(o => o.id);
    const allSelected = paginatedIds.every(id => selectedOnus.includes(id));
    if (allSelected) {
      setSelectedOnus(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      setSelectedOnus(prev => [...new Set([...prev, ...paginatedIds])]);
    }
  };

  const bulkReboot = async () => {
    if (!checkPermission('Reboot ONUs', 'engineer')) return;
    if (!confirm(`Confirm reboot command transmission to the ${selectedOnus.length} selected ONUs?`)) return;
    addToast(`Reboot sequence initiated for ${selectedOnus.length} ONUs.`, 'success');
    logActivity('Bulk ONU Reboot', `Issued hardware reboot to ${selectedOnus.length} ONUs`);
    
    setOnuList(prev => prev.map(onu => {
      if (selectedOnus.includes(onu.id)) {
        return { ...onu, status: 'offline', rxPower: '0.00' };
      }
      return onu;
    }));

    setTimeout(() => {
      setOnuList(prev => prev.map(onu => {
        if (selectedOnus.includes(onu.id)) {
          return { ...onu, status: 'online', rxPower: (-15 - Math.random() * 8).toFixed(2) };
        }
        return onu;
      }));
      addToast(`Selected ONUs online after reboot.`, 'success');
    }, 8500);

    setSelectedOnus([]);
  };

  const bulkDeregister = () => {
    if (!checkPermission('Deregister ONUs', 'engineer')) return;
    if (!confirm(`Are you absolutely sure you want to deregister and clear configuration profiles for these ${selectedOnus.length} ONUs?`)) return;
    
    setOnuList(prev => prev.filter(onu => !selectedOnus.includes(onu.id)));
    addToast(`Successfully deregistered ${selectedOnus.length} ONUs from PON ports.`, 'success');
    logActivity('Bulk ONU Deregister', `Deregistered and wiped configs for ${selectedOnus.length} ONUs`);
    setSelectedOnus([]);
  };

  const applyProfile = () => {
    if (!checkPermission('Apply ONU Config Profile', 'engineer')) return;
    if (!selectedProfile) {
      addToast('Please select a profile template.', 'danger');
      return;
    }
    const templateName = templates.find(t => t.id === parseInt(selectedProfile))?.name || 'VLAN Profile';
    
    setOnuList(prev => prev.map(onu => {
      if (selectedOnus.includes(onu.id)) {
        return { ...onu, model: `${onu.model} [P]` };
      }
      return onu;
    }));

    addToast(`Applied config profile "${templateName}" to ${selectedOnus.length} ONUs.`, 'success');
    logActivity('Profile Applied', `Applied profile "${templateName}" to ${selectedOnus.length} ONUs`);
    setProfileModalOpen(false);
    setSelectedOnus([]);
    setSelectedProfile('');
  };

  // ==================== CONFIG TERMINAL EXECUTION ====================
  const replaceCodeVariables = () => {
    let script = configCode;
    Object.keys(configVariables).forEach(key => {
      script = script.replaceAll(`{{${key}}}`, configVariables[key]);
    });
    return script;
  };

  const runConfiguration = () => {
    if (!checkPermission('Execute Device Configuration', 'engineer')) return;
    if (!configTargetOlt) {
      addToast('Please choose a target OLT device.', 'danger');
      return;
    }
    const targetOltName = oltList.find(o => o.id === parseInt(configTargetOlt))?.name || 'OLT';

    setConfigModalOpen(true);
    setConfigApplying(true);
    setConfigProgress(0);
    setConfigLogs([]);

    const steps = [
      { prg: 10, log: 'Establishing encrypted connection to OLT via SSH/Telnet port 23...' },
      { prg: 25, log: `Connection established. Exchanging SNMP v2 credentials with OLT-Agent...` },
      { prg: 40, log: 'Sending authorization handshake: user "admin" authenticated.' },
      { prg: 55, log: 'Entering terminal config terminal mode (configure terminal)...' },
      { prg: 70, log: 'Applying VLAN map & bridge rules. Setting loopback overrides...' },
      { prg: 85, log: 'Executing write memory command to commit changes to system NVRAM...' },
      { prg: 100, log: `Command execution complete. OLT report code: 200 OK. Connection closed.` }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setConfigProgress(step.prg);
        setConfigLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step.log}`]);
        if (step.prg === 100) {
          setConfigApplying(false);
          addToast(`VLAN Profile successfully provisioned on ${targetOltName}.`, 'success');
          logActivity('Config Applied', `Applied profile template "${configActiveTemplate.name}" to OLT ${targetOltName}`);
        }
      }, (idx + 1) * 700);
    });
  };

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [configLogs]);

  // ==================== REPORTS ACTIONS ====================
  const exportReport = (format) => {
    setReportsExporting(true);
    setTimeout(() => {
      setReportsExporting(false);
      addToast(`Telemetry report exported as ${format.toUpperCase()}`, 'success');
      logActivity('Report Exported', `Generated and downloaded telemetry report (${reportsType}, format: ${format})`);
      
      const content = `OLT NOC Dashboard Export\nType: ${reportsType}\nRange: ${reportsRange}\nDate: ${new Date().toISOString()}\n`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noc_report_${reportsType}_${reportsRange}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    }, 2000);
  };

  // ==================== USER MANAGEMENT ACTIONS ====================
  const openAddUser = () => {
    if (!checkPermission('Manage User Accounts', 'admin')) return;
    setUserForm({ name: '', email: '', role: 'engineer', status: 'active', lastLogin: new Date().toISOString(), password: '' });
    setUserModalOpen(true);
  };

  const openEditUser = (usr) => {
    if (!checkPermission('Manage User Accounts', 'admin')) return;
    setUserForm({ ...usr, password: '' });
    setUserModalOpen(true);
  };

  const saveUser = () => {
    if (!userForm.name || !userForm.email) {
      addToast('Please fill out all required fields.', 'danger');
      return;
    }
    if (userForm.id) {
      const existingUser = userList.find(u => u.id === userForm.id);
      const updatedUser = { 
        ...userForm, 
        password: userForm.password || existingUser?.password || 'password123' 
      };
      setUserList(prev => prev.map(u => u.id === userForm.id ? updatedUser : u));
      addToast(`User account for ${userForm.name} updated.`, 'success');
    } else {
      const newUser = { 
        ...userForm, 
        id: Date.now(), 
        password: userForm.password || 'password123' 
      };
      setUserList(prev => [...prev, newUser]);
      addToast(`Created user account for ${userForm.name}.`, 'success');
      logActivity('User Added', `NOC Administrator provisioned user account: ${userForm.email}`);
    }
    setUserModalOpen(false);
  };

  const deleteUser = (id) => {
    if (!checkPermission('Manage User Accounts', 'admin')) return;
    if (id === 1) {
      addToast('Cannot delete primary system administrator.', 'danger');
      return;
    }
    const email = userList.find(u => u.id === id)?.email || 'User';
    if (confirm(`Remove access permission for account: ${email}?`)) {
      setUserList(prev => prev.filter(u => u.id !== id));
      addToast(`Removed account access for ${email}`, 'success');
      logActivity('User Deleted', `Revoked permissions for account: ${email}`);
    }
  };

  // ==================== SYSTEM SETTINGS & DB ACTIONS ====================
  const saveSettings = () => {
    if (!checkPermission('Modify Settings', 'admin')) return;
    addToast('SNMP configuration saved and applied.', 'success');
    logActivity('Settings Modified', 'Applied global SNMP configuration and telemetry pooling thresholds');
  };

  const testNotification = (channel) => {
    addToast(`Test webhook payload successfully transmitted via ${channel.toUpperCase()}`, 'success');
    logActivity('Notification Test', `Fired testing alert payload via channel: ${channel}`);
  };

  // WIPE DATABASE
  const wipeAllTelemetry = () => {
    if (!checkPermission('Wipe Database Registry', 'admin')) return;
    if (!confirm('Are you absolutely sure you want to clear OLT, ONU, Router, Switch, and Alarm lists? This will empty the active inventory.')) return;
    setOltList([]);
    setOnuList([]);
    setPortsList([]);
    setAlarmList([]);
    setActivityLog([]);
    setRouterList([]);
    setRouterInterfaces([]);

    localStorage.removeItem('olt_manager_olts');
    localStorage.removeItem('olt_manager_onus');
    localStorage.removeItem('olt_manager_ports');
    localStorage.removeItem('olt_manager_alarms');
    localStorage.removeItem('olt_manager_activity');
    localStorage.removeItem('olt_manager_routers');
    localStorage.removeItem('olt_manager_router_interfaces');

    setSelectedOlt(null);
    setSelectedRouter(null);
    addToast('Chassis and Router telemetry databases wiped', 'success');
    logActivity('Database Wiped', 'NOC Administrator issued database truncation script');
  };

  // LOAD DUMMY MOCK DATA
  const loadMockTelemetry = () => {
    setOltList(mockOlts);
    setOnuList(mockOnus);
    setPortsList(mockPorts);
    setAlarmList(mockAlarms);
    setActivityLog(initialActivityLog);

    const defaultRouters = [
      { id: 101, name: 'Core-Juniper-MX204', ip: '10.100.1.254', deviceType: 'router', vendor: 'Juniper', model: 'MX204', role: 'Core', status: 'online', uptime: 1209600, cpu: 28, memory: 42, temp: 38, location: 'DC-Core-01', snmpPort: 161, community: 'public', interfacesCount: 4 },
      { id: 102, name: 'Agg-MikroTik-CCR2116', ip: '10.100.2.254', deviceType: 'router', vendor: 'MikroTik', model: 'CCR2116-12G-4S+', role: 'Aggregation', status: 'online', uptime: 604800, cpu: 14, memory: 22, temp: 44, location: 'POP-North', snmpPort: 161, community: 'public', interfacesCount: 5 },
      { id: 103, name: 'Edge-Cisco-Catalyst', ip: '10.100.3.254', deviceType: 'switch', vendor: 'Cisco', model: 'Catalyst 9300', role: 'Edge', status: 'warning', uptime: 259200, cpu: 48, memory: 65, temp: 51, location: 'POP-South', snmpPort: 161, community: 'public', interfacesCount: 4 }
    ];

    const defaultInterfaces = [
      {
        deviceId: 101,
        interfaces: [
          { name: 'xe-0/0/0', desc: 'Uplink to Transit Provider', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 4500, txMbps: 1200 },
          { name: 'xe-0/0/1', desc: 'Downlink to OLT-VSOL-01', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 850, txMbps: 3400 },
          { name: 'xe-0/0/2', desc: 'Core Ring link to DC-2', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 2100, txMbps: 2100 },
          { name: 'ge-0/1/0', desc: 'Out-Of-Band Management Link', speed: '1Gbps', admin: 'up', oper: 'down', rxMbps: 0, txMbps: 0 }
        ]
      },
      {
        deviceId: 102,
        interfaces: [
          { name: 'sfp-sfpplus1', desc: 'Aggregation Uplink xe-0/0/1', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 3200, txMbps: 800 },
          { name: 'sfp-sfpplus2', desc: 'Aggregation Link xe-0/0/2', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 1200, txMbps: 1400 },
          { name: 'ether1', desc: 'OOB Mgmt', speed: '1Gbps', admin: 'up', oper: 'up', rxMbps: 1, txMbps: 2 },
          { name: 'ether2', desc: 'NTP Server local link', speed: '1Gbps', admin: 'up', oper: 'down', rxMbps: 0, txMbps: 0 },
          { name: 'ether3', desc: 'Spare interface copper', speed: '1Gbps', admin: 'down', oper: 'down', rxMbps: 0, txMbps: 0 }
        ]
      },
      {
        deviceId: 103,
        interfaces: [
          { name: 'GigabitEthernet1/0/1', desc: 'Management Console Sockets', speed: '1Gbps', admin: 'up', oper: 'up', rxMbps: 2, txMbps: 5 },
          { name: 'TenGigabitEthernet1/1/1', desc: 'Agg Trunk link to MikroTik sfp1', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 800, txMbps: 3100 },
          { name: 'TenGigabitEthernet1/1/2', desc: 'Access Switch Port Core Downlink', speed: '10Gbps', admin: 'up', oper: 'up', rxMbps: 1400, txMbps: 1200 },
          { name: 'TenGigabitEthernet1/1/3', desc: 'Redundant ring link (Standby)', speed: '10Gbps', admin: 'up', oper: 'down', rxMbps: 0, txMbps: 0 }
        ]
      }
    ];

    setRouterList(defaultRouters);
    setRouterInterfaces(defaultInterfaces);

    addToast('Successfully loaded mock NOC database telemetry!', 'success');
    logActivity('Mock Data Ingested', 'Loaded multi-vendor telemetry archive pack into local memory');
  };

  // ==================== PERMISSIONS & AUTHENTICATION ====================
  const checkPermission = (action, requiredRole = 'admin') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (requiredRole === 'engineer' && currentUser.role === 'engineer') return true;
    
    addToast(`Permission Denied: ${currentUser.role.toUpperCase()} role is unauthorized to perform action: ${action}`, 'danger');
    return false;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginForm.email || !loginForm.password) {
      setLoginError('All authentication credentials are required.');
      return;
    }
    setLoginLoading(true);
    setTimeout(() => {
      // Find user in userList
      const matchedUser = userList.find(u => u.email.toLowerCase() === loginForm.email.toLowerCase());
      // Fallback password checks to ensure seed users can login even if localStorage doesn't have password keys yet
      const isValidPassword = matchedUser && (
        matchedUser.password === loginForm.password ||
        (matchedUser.id === 1 && loginForm.password === 'admin123') ||
        (matchedUser.id === 2 && loginForm.password === 'engineer123') ||
        (matchedUser.id === 3 && loginForm.password === 'engineer123') ||
        (matchedUser.id === 4 && loginForm.password === 'viewer123') ||
        (matchedUser.id === 5 && loginForm.password === 'admin123')
      );

      if (matchedUser && isValidPassword) {
        if (matchedUser.status !== 'active') {
          setLoginError('Account has been suspended. Contact system administrator.');
          setLoginLoading(false);
          return;
        }
        
        // Update last login timestamp in state and list
        const updatedUser = { ...matchedUser, lastLogin: new Date().toISOString() };
        setUserList(prev => prev.map(u => u.id === matchedUser.id ? updatedUser : u));
        
        setIsAuthenticated(true);
        setCurrentUser(updatedUser);
        localStorage.setItem('olt_manager_auth', 'true');
        localStorage.setItem('olt_manager_current_user', JSON.stringify(updatedUser));
        
        addToast(`Welcome back, ${matchedUser.name}! Session established.`, 'success');
        
        // Log to NOC audit logs
        const newLog = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          user: matchedUser.name,
          action: 'User Login',
          detail: `Operator ${matchedUser.email} authenticated successfully (Role: ${matchedUser.role})`
        };
        setActivityLog(prev => [newLog, ...prev]);
      } else {
        setLoginError('Invalid corporate email or security access code.');
      }
      setLoginLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    if (currentUser) {
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        action: 'User Logout',
        detail: `Operator ${currentUser.email} session terminated.`
      };
      setActivityLog(prev => [newLog, ...prev]);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('olt_manager_auth');
    localStorage.removeItem('olt_manager_current_user');
    addToast('Secure NOC session terminated.', 'info');
  };

  // ==================== AUDIT LOGGER ====================
  const logActivity = (action, detail) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'System',
      action,
      detail
    };
    setActivityLog(prev => [newLog, ...prev]);
  };

  // ==================== HTML / JSX RENDERS ====================

  // T1: DASHBOARD
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Server} label="Total OLT Chassis" value={dynamicStats.totalOlts} subtext={`${dynamicStats.onlineOlts} online, ${dynamicStats.offlineOlts} offline`} color={COLORS.blue} onClick={() => setActiveTab('olts')} />
        <StatCard icon={Network} label="Core Infrastructure" value={dynamicStats.totalRouters} subtext={`${dynamicStats.onlineRouters} online nodes`} color={COLORS.purple} onClick={() => setActiveTab('routers')} />
        <StatCard icon={Wifi} label="Registered ONUs" value={dynamicStats.totalOnus} subtext={`${dynamicStats.onlineOnus} online active`} trend={dynamicStats.totalOnus > 0 ? 1.8 : undefined} color={COLORS.green} onClick={() => setActiveTab('onus')} />
        <StatCard icon={Bell} label="Active System Alarms" value={dynamicStats.activeAlarms} subtext={`${dynamicStats.criticalAlarms} critical priority`} color={COLORS.red} onClick={() => { setAlarmFilter(f => ({ ...f, status: 'active' })); setActiveTab('alarms'); }} />
      </div>

      {oltList.length === 0 && routerList.length === 0 ? (
        <div className="bg-olt-panel border border-olt-border rounded-xl p-10 text-center space-y-4 shadow-xl">
          <Server size={48} className="mx-auto text-olt-muted animate-pulse" />
          <h3 className="text-lg font-bold">No Devices Registered</h3>
          <p className="text-sm text-olt-muted max-w-md mx-auto">Your network inventory registry is blank. Register distribution OLTs or core routing/switching nodes, or populate mock demo data in Settings.</p>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={openAddOlt}><Plus size={16} /> Add OLT Chassis</Button>
            <Button onClick={openAddRouter} variant="secondary"><Plus size={16} /> Add Router/Switch</Button>
            <Button variant="secondary" onClick={() => setActiveTab('settings')}><Settings size={16} /> Open Settings</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Vendor Chassis Distribution">
              <div className="h-[250px] flex items-center justify-center">
                {dynamicVendorDistribution.length === 0 ? (
                  <span className="text-xs text-olt-muted font-mono">No data points</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dynamicVendorDistribution} dataKey="count" nameKey="vendor" cx="50%" cy="50%" outerRadius={75} label={({ vendor, count }) => `${vendor}: ${count}`}>
                        {dynamicVendorDistribution.map((_, i) => (
                          <Cell key={i} fill={[COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple, COLORS.cyan][i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#e6edf3' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Network Technology Splits">
              <div className="h-[250px]">
                {dynamicTechDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-olt-muted font-mono">No data points</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicTechDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis dataKey="technology" stroke="#8b949e" fontSize={11} />
                      <YAxis stroke="#8b949e" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#e6edf3' }} />
                      <Bar dataKey="count" fill={COLORS.blue} radius={[4, 4, 0, 0]}>
                        {dynamicTechDistribution.map((_, idx) => (
                          <Cell key={idx} fill={[COLORS.blue, COLORS.cyan, COLORS.purple][idx % 3]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Active ONU Growth Trends (24h)">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={onuHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="time" stroke="#8b949e" fontSize={9} />
                    <YAxis stroke="#8b949e" fontSize={9} />
                    <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#e6edf3' }} />
                    <Area type="monotone" dataKey="online" name="Online ONUs" stroke={COLORS.green} fill={`${COLORS.green}18`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="NOC Border Bandwidth Throughput">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trafficHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="time" stroke="#8b949e" fontSize={9} />
                    <YAxis stroke="#8b949e" fontSize={9} />
                    <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#e6edf3' }} />
                    <Line type="monotone" dataKey="inbound" name="Inbound (Gbps)" stroke={COLORS.blue} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="outbound" name="Outbound (Gbps)" stroke={COLORS.green} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Core infrastructure snap view */}
          {routerList.length > 0 && (
            <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted mb-4 border-b border-olt-border/30 pb-2">Core Devices Health Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {routerList.map(dev => (
                  <div key={dev.id} onClick={() => { setSelectedRouter(dev); setActiveTab('routers'); }}
                    className="bg-olt-surface/30 rounded-lg p-4 cursor-pointer hover:border-olt-blue/50 border border-olt-border transition-all table-row-hover flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm text-olt-text">{dev.name}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${dev.status === 'online' ? 'bg-olt-green pulse-online' : dev.status === 'warning' ? 'bg-olt-amber' : 'bg-olt-red'}`} />
                      </div>
                      <p className="text-xs text-olt-muted font-mono">{dev.ip} // {dev.model}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-olt-purple/20 text-olt-purple rounded font-bold uppercase">{dev.deviceType}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-olt-blue/20 text-olt-blue rounded font-bold">{dev.vendor}</span>
                      </div>
                    </div>
                    <div className="flex justify-between mt-4 pt-2 border-t border-olt-border/30 text-xs font-mono text-olt-muted">
                      <span>CPU: <strong>{dev.cpu}%</strong></span>
                      <span>Temp: <span className={dev.temp > 50 ? 'text-olt-amber' : 'text-olt-green'}>{dev.temp}°C</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // T2: OLT INVENTORY & DETAILS
  const renderOlts = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">OLT Chassis Inventory</h2>
          <p className="text-xs text-olt-muted mt-0.5">Manage and query core distribution nodes</p>
        </div>
        <div className="flex gap-2">
          {oltList.length > 0 && (
            <Button variant="secondary" onClick={() => exportToCSV(filteredOlts, 'olt-inventory')}>
              <Download size={14} /> Export
            </Button>
          )}
          <Button onClick={openAddOlt}><Plus size={14} /> Add OLT Chassis</Button>
        </div>
      </div>

      {oltList.length === 0 ? (
        <div className="bg-olt-panel border border-olt-border rounded-xl p-10 text-center space-y-4 shadow-xl">
          <Server size={48} className="mx-auto text-olt-muted animate-pulse" />
          <h3 className="text-lg font-bold">No Core OLT Systems</h3>
          <p className="text-sm text-olt-muted max-w-sm mx-auto">Active inventory registry is blank. Add your core multi-vendor chassis IP maps here.</p>
          <Button onClick={openAddOlt}><Plus size={16} /> Register First OLT</Button>
        </div>
      ) : (
        <>
          <FilterBar>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-olt-muted" />
              <input type="text" placeholder="Search by name, IP, model..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-olt-panel border border-olt-border rounded-lg text-sm focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
            </div>
            <Select value={oltFilter.vendor} onChange={v => setOltFilter(f => ({ ...f, vendor: v }))} options={[{ value: 'VSOL', label: 'VSOL' }, { value: 'CDATA', label: 'CDATA' }, { value: 'BDCOM', label: 'BDCOM' }, { value: 'ZTE', label: 'ZTE' }, { value: 'Huawei', label: 'Huawei' }, { value: 'Nokia', label: 'Nokia' }]} placeholder="All Vendors" />
            <Select value={oltFilter.tech} onChange={v => setOltFilter(f => ({ ...f, tech: v }))} options={[{ value: 'GPON', label: 'GPON' }, { value: 'EPON', label: 'EPON' }, { value: 'XGS-PON', label: 'XGS-PON' }]} placeholder="All Tech" />
            <Select value={oltFilter.status} onChange={v => setOltFilter(f => ({ ...f, status: v }))} options={[{ value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }, { value: 'warning', label: 'Warning' }]} placeholder="All Status" />
          </FilterBar>

          {selectedOlt ? (
            <OLTDetailView olt={selectedOlt} onBack={() => setSelectedOlt(null)} />
          ) : (
            <>
              <DataTable
                columns={[
                  { key: 'name', label: 'Name', render: v => <span className="font-mono font-bold text-olt-blue hover:underline">{v}</span> },
                  { key: 'ip', label: 'IP Address', render: v => <span className="font-mono text-xs">{v}</span> },
                  { key: 'vendor', label: 'Vendor', render: v => <span className="px-2 py-0.5 bg-olt-surface text-olt-text border border-olt-border rounded text-xs font-bold">{v}</span> },
                  { key: 'technology', label: 'Tech' },
                  { key: 'model', label: 'Model', render: v => <span className="font-mono text-xs">{v}</span> },
                  { key: 'location', label: 'Location' },
                  { key: 'status', label: 'Status', render: v => <StatusBadge status={v} pulse /> },
                  { key: 'uptime', label: 'Uptime', render: v => formatUptimeDisplay(v) },
                  { key: 'onuCount', label: 'ONUs', render: v => <span className="font-mono font-bold">{v}</span> },
                  { key: 'actions', label: 'Actions', render: (_, row) => (
                    <div className="flex gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEditOlt(row)} className="p-1 hover:bg-olt-surface rounded"><Edit2 size={13} className="text-olt-muted hover:text-olt-text" /></button>
                      <button onClick={() => deleteOlt(row.id)} className="p-1 hover:bg-olt-surface rounded"><Trash2 size={13} className="text-olt-red" /></button>
                    </div>
                  ), className: 'text-right' },
                ]}
                data={paginatedOlts}
                onRowClick={setSelectedOlt}
              />
              <Pagination currentPage={oltPage} totalPages={Math.ceil(filteredOlts.length / pageSize)} onPageChange={setOltPage} />
            </>
          )}
        </>
      )}

      <Modal isOpen={oltModalOpen} onClose={() => setOltModalOpen(false)} title={oltForm?.id ? 'Edit OLT Chassis' : 'Add OLT Chassis'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Name <span className="text-olt-red">*</span></label>
            <input value={oltForm?.name || ''} onChange={e => setOltForm({ ...oltForm, name: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" placeholder="e.g. OLT-CORE-MAIN" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">IP Address <span className="text-olt-red">*</span></label>
            <input value={oltForm?.ip || ''} onChange={e => setOltForm({ ...oltForm, ip: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none font-mono" placeholder="e.g. 10.0.0.1" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Port</label>
            <input type="number" value={oltForm?.port || 23} onChange={e => setOltForm({ ...oltForm, port: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">SNMP Community</label>
            <input value={oltForm?.community || ''} onChange={e => setOltForm({ ...oltForm, community: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Username</label>
            <input value={oltForm?.username || ''} onChange={e => setOltForm({ ...oltForm, username: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Password</label>
            <input type="password" value={oltForm?.password || ''} onChange={e => setOltForm({ ...oltForm, password: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Vendor</label>
            <select value={oltForm?.vendor || 'VSOL'} onChange={e => setOltForm({ ...oltForm, vendor: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none">
              {['VSOL', 'CDATA', 'BDCOM', 'ZTE', 'Huawei', 'Nokia'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Technology</label>
            <select value={oltForm?.technology || 'GPON'} onChange={e => setOltForm({ ...oltForm, technology: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none">
              {['GPON', 'EPON', 'XGS-PON'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Model</label>
            <input value={oltForm?.model || ''} onChange={e => setOltForm({ ...oltForm, model: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Location</label>
            <select value={oltForm?.location || ''} onChange={e => setOltForm({ ...oltForm, location: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none">
              {['DC-Core-01', 'DC-Edge-02', 'POP-North', 'POP-South', 'POP-East', 'POP-West', 'CO-Main', 'CO-Backup'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Notes</label>
            <textarea value={oltForm?.notes || ''} onChange={e => setOltForm({ ...oltForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none resize-none" placeholder="Administrative annotations..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setOltModalOpen(false)}>Cancel</Button>
          <Button onClick={saveOlt}><Check size={14} /> Commit Changes</Button>
        </div>
      </Modal>
    </div>
  );

  function OLTDetailView({ olt, onBack }) {
    const oltPorts = portsList.find(p => p.oltId === olt.id)?.ports || [];
    const oltOnus = onuList.filter(o => o.oltId === olt.id);
    const [expandedPort, setExpandedPort] = useState(null);

    const handleRebootOlt = async () => {
      if (!checkPermission('Reboot OLT Chassis', 'engineer')) return;
      if (!confirm(`Warning: You are initiating a full systems reboot for ${olt.name}. All active customer PON links will collapse. Proceed?`)) return;
      addToast(`Transmiting reboot sequence for OLT ${olt.name}...`, 'danger');
      setOltList(prev => prev.map(o => o.id === olt.id ? { ...o, status: 'offline', uptime: 0, cpu: 0, memory: 0 } : o));
      logActivity('Chassis Rebooted', `Issued physical power-cycle reboot to chassis: ${olt.name}`);
      
      setTimeout(() => {
        setOltList(prev => prev.map(o => o.id === olt.id ? { ...o, status: 'online', cpu: 10, memory: 25 } : o));
        addToast(`Chassis OLT ${olt.name} is back online.`, 'success');
      }, 7000);
    };

    return (
      <div className="space-y-4 animate-fade-in border border-olt-border bg-olt-panel/40 p-5 rounded-xl">
        <div className="flex items-center justify-between border-b border-olt-border pb-3">
          <button onClick={onBack} className="flex items-center gap-2 text-olt-muted hover:text-olt-text transition-colors text-sm font-semibold">
            <ChevronLeft size={16} /> Back to Telemetry Index
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={handleRebootOlt}><Power size={13} /> Reboot Chassis</Button>
            <Button size="sm" variant="secondary" onClick={() => openEditOlt(olt)}><Edit2 size={13} /> Edit Config</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-mono text-olt-text">{olt.name}</h3>
                <StatusBadge status={olt.status} pulse />
              </div>
              <p className="text-xs text-olt-muted font-mono mt-1">Management IP: {olt.ip}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <span className="block text-[10px] uppercase font-bold text-olt-muted">Vendor</span>
                <span className="text-sm font-bold">{olt.vendor}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-olt-muted">Model</span>
                <span className="text-sm font-mono">{olt.model || 'Unknown'}</span>
              </div>
              <div className="mt-2">
                <span className="block text-[10px] uppercase font-bold text-olt-muted">Tech Type</span>
                <span className="text-sm font-bold">{olt.technology}</span>
              </div>
              <div className="mt-2">
                <span className="block text-[10px] uppercase font-bold text-olt-muted">Uptime</span>
                <span className="text-sm font-mono text-olt-green">{formatUptime(olt.uptime)}</span>
              </div>
            </div>
          </div>

          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">Hardware Telemetry Metrics</h4>
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                <span className="text-olt-text">CPU Core Utilization</span>
                <span className={olt.cpu > 70 ? 'text-olt-red font-bold' : 'text-olt-muted'}>{olt.cpu}%</span>
              </div>
              <div className="h-2 bg-olt-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${olt.cpu}%`, backgroundColor: olt.cpu > 70 ? COLORS.red : COLORS.green }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                <span className="text-olt-text">RAM Memory Buffer</span>
                <span className={olt.memory > 80 ? 'text-olt-red font-bold' : 'text-olt-muted'}>{olt.memory}%</span>
              </div>
              <div className="h-2 bg-olt-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${olt.memory}%`, backgroundColor: olt.memory > 80 ? COLORS.red : olt.memory > 60 ? COLORS.amber : COLORS.blue }} />
              </div>
            </div>
          </div>

          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 flex flex-col justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">Resource Summaries</h4>
            <div className="grid grid-cols-2 gap-4 my-auto">
              <div className="text-center p-3 bg-olt-surface/30 border border-olt-border rounded-lg">
                <span className="block text-2xs uppercase text-olt-muted">Total PON Ports</span>
                <span className="text-xl font-bold font-mono text-olt-blue">{olt.portCount}</span>
              </div>
              <div className="text-center p-3 bg-olt-surface/30 border border-olt-border rounded-lg">
                <span className="block text-2xs uppercase text-olt-muted">ONUs Active</span>
                <span className="text-xl font-bold font-mono text-olt-green">{oltOnus.length}</span>
              </div>
            </div>
          </div>
        </div>

        {oltOnus.length === 0 && (
          <div className="bg-olt-panel border border-olt-border rounded-xl p-6 text-center space-y-3">
            <AlertCircle size={24} className="mx-auto text-olt-amber animate-pulse" />
            <h4 className="text-sm font-bold">Empty OLT - Query Interface Missing</h4>
            <p className="text-xs text-olt-muted max-w-md mx-auto">This device does not contain any registered ONU records in the local browser database yet. Run SNMP poll to auto-discover ONUs.</p>
            <Button size="sm" onClick={() => syncOnusViaSnmp(olt.id)} loading={syncingOltId === olt.id}>
              <RefreshCcw size={13} className={syncingOltId === olt.id ? 'animate-spin' : ''} /> Scan & Discover ONUs via SNMP
            </Button>
          </div>
        )}

        {oltPorts.length > 0 && (
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-olt-border/30 pb-2 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted">Integrated PON Ports Grid</h3>
              {oltOnus.length > 0 && (
                <button onClick={() => syncOnusViaSnmp(olt.id)} disabled={syncingOltId === olt.id} className="text-xs text-olt-blue hover:underline flex items-center gap-1 font-semibold">
                  <RefreshCcw size={12} className={syncingOltId === olt.id ? 'animate-spin' : ''} /> Rescan Interfaces
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {oltPorts.map(port => {
                const portOnus = oltOnus.filter(o => o.port === port.portNumber);
                const onlineOnusCount = portOnus.filter(o => o.status === 'online').length;
                return (
                  <div key={port.id} onClick={() => setExpandedPort(expandedPort === port.portNumber ? null : port.portNumber)}
                    className={`bg-olt-surface/20 rounded-lg p-4 cursor-pointer border transition-all ${expandedPort === port.portNumber ? 'border-olt-blue bg-olt-blue/5' : 'border-olt-border hover:border-olt-blue/40'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm">PON Port {port.portNumber}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${port.status === 'up' ? 'bg-olt-green pulse-online' : 'bg-olt-red'}`} />
                    </div>
                    <p className="text-xs text-olt-muted font-mono">{portOnus.length} ONUs ({onlineOnusCount} online)</p>
                    {port.rxPower && <p className="text-xs font-mono text-olt-green mt-1">RX Loop: {port.rxPower} dBm</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {expandedPort && oltOnus.length > 0 && (
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 animate-slide-in shadow-lg">
            <div className="flex items-center justify-between border-b border-olt-border/30 pb-2 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-olt-text">ONUs Registered on Port {expandedPort}</h3>
              <span className="text-xs font-mono text-olt-muted">{oltOnus.filter(o => o.port === expandedPort).length} devices found</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-olt-border text-left text-xs font-semibold text-olt-muted uppercase">
                    <th className="px-4 py-2">ONU ID</th>
                    <th className="px-4 py-2">Serial Number</th>
                    <th className="px-4 py-2">Model</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Rx Power</th>
                    <th className="px-4 py-2">Loop Distance</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olt-border/30 font-mono text-xs">
                  {oltOnus.filter(o => o.port === expandedPort).map(onu => (
                    <tr key={onu.id} className="table-row-hover font-mono">
                      <td className="px-4 py-2 text-olt-text font-bold">{onu.onuId}</td>
                      <td className="px-4 py-2 text-olt-muted">{onu.serialNumber}</td>
                      <td className="px-4 py-2 text-olt-text">{onu.model}</td>
                      <td className="px-4 py-2"><StatusBadge status={onu.status} /></td>
                      <td className="px-4 py-2"><PowerIndicator rxPower={onu.rxPower} /></td>
                      <td className="px-4 py-2 text-olt-muted">{onu.distance}m</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { toggleOnuSelection(onu.id); bulkReboot(); }} className="p-1 hover:bg-olt-surface rounded" title="Reboot ONT"><RefreshCw size={13} className="text-olt-amber" /></button>
                          <button onClick={() => { toggleOnuSelection(onu.id); bulkDeregister(); }} className="p-1 hover:bg-olt-surface rounded" title="Deregister ONT"><Power size={13} className="text-olt-red" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // T3: ONU INVENTORY
  const renderOnus = () => {
    const isAllSelected = paginatedOnus.length > 0 && paginatedOnus.every(onu => selectedOnus.includes(onu.id));
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">ONU Management Index</h2>
            <p className="text-xs text-olt-muted mt-0.5">Bulk provision and optical trace diagnostic indicators</p>
          </div>
          {onuList.length > 0 && (
            <Button variant="secondary" onClick={() => exportToCSV(filteredOnus, 'onu-inventory')}>
              <Download size={14} /> Export CSV
            </Button>
          )}
        </div>

        {onuList.length === 0 ? (
          <div className="bg-olt-panel border border-olt-border rounded-xl p-10 text-center space-y-4 shadow-xl">
            <Wifi size={48} className="mx-auto text-olt-muted animate-pulse" />
            <h3 className="text-lg font-bold">No Active ONUs discovered</h3>
            <p className="text-sm text-olt-muted max-w-sm mx-auto">Optical network terminals list is empty. Go to OLT Inventory, select a chassis node, and scan via SNMP to discover ONUs.</p>
            <Button onClick={() => setActiveTab('olts')} variant="secondary">Go to OLT Inventory</Button>
          </div>
        ) : (
          <>
            <FilterBar>
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-olt-muted" />
                <input type="text" placeholder="Search by Serial, MAC, name or model..." value={onuSearch} onChange={e => { setOnuSearch(e.target.value); setOnuPage(1); }} className="w-full pl-10 pr-4 py-2 bg-olt-panel border border-olt-border rounded-lg text-sm focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
              </div>
              <Select value={onuFilter.olt} onChange={v => { setOnuFilter(f => ({ ...f, olt: v })); setOnuPage(1); }} options={oltList.map(o => ({ value: `olt-${o.id}`, label: o.name }))} placeholder="All Host OLTs" />
              <Select value={onuFilter.status} onChange={v => { setOnuFilter(f => ({ ...f, status: v })); setOnuPage(1); }} options={[{ value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }]} placeholder="All Statuses" />
              <Select value={onuFilter.power} onChange={v => { setOnuFilter(f => ({ ...f, power: v })); setOnuPage(1); }} options={[{ value: 'good', label: 'Good (>-25dBm)' }, { value: 'marginal', label: 'Marginal (-25 to -27dBm)' }, { value: 'poor', label: 'Poor (<-27dBm)' }]} placeholder="All Optical Signal Levels" />
            </FilterBar>

            <DataTable
              columns={[
                {
                  key: 'selection',
                  label: (
                    <button onClick={toggleSelectAllOnus} className="p-0.5 rounded text-olt-muted hover:text-olt-text">
                      {isAllSelected ? <CheckSquare size={16} className="text-olt-blue" /> : <Square size={16} />}
                    </button>
                  ),
                  render: (_, row) => (
                    <button onClick={() => toggleOnuSelection(row.id)} className="p-0.5 rounded text-olt-muted hover:text-olt-text">
                      {selectedOnus.includes(row.id) ? <CheckSquare size={16} className="text-olt-blue" /> : <Square size={16} />}
                    </button>
                  )
                },
                { key: 'name', label: 'Device Name', render: v => <span className="font-semibold">{v}</span> },
                {
                  key: 'serialNumber',
                  label: 'Serial Number',
                  render: v => (
                    <div className="flex items-center gap-1 font-mono text-xs text-olt-muted">
                      <span>{v}</span>
                      <button onClick={() => { navigator.clipboard.writeText(v); addToast('Serial number copied to clipboard', 'success'); }} className="p-0.5 hover:bg-olt-surface rounded"><Copy size={11} /></button>
                    </div>
                  )
                },
                { key: 'mac', label: 'MAC Address', render: v => <span className="font-mono text-xs">{v}</span> },
                { key: 'model', label: 'Model', render: v => <span className="font-mono text-xs text-olt-text">{v}</span> },
                { key: 'oltId', label: 'Host OLT', render: v => <span className="font-bold">{oltList.find(o => o.id === v)?.name || `OLT-${v}`}</span> },
                { key: 'port', label: 'Port', render: (_, row) => <span className="font-mono">PON {row.port} / ID: {row.onuId}</span> },
                { key: 'rxPower', label: 'Rx Power', render: v => <PowerIndicator rxPower={v} /> },
                { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, row) => (
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => { toggleOnuSelection(row.id); bulkReboot(); }} className="p-1 hover:bg-olt-surface rounded" title="Reboot ONU"><RefreshCw size={13} className="text-olt-amber" /></button>
                      <button onClick={() => { toggleOnuSelection(row.id); bulkDeregister(); }} className="p-1 hover:bg-olt-surface rounded" title="Deregister ONU"><Power size={13} className="text-olt-red" /></button>
                    </div>
                  ),
                  className: 'text-right'
                }
              ]}
              data={paginatedOnus}
            />

            <Pagination currentPage={onuPage} totalPages={Math.ceil(filteredOnus.length / pageSize)} onPageChange={setOnuPage} />

            {/* Floating Bulk Actions Bar */}
            {selectedOnus.length > 0 && (
              <div className="fixed bottom-14 left-1/2 -translate-x-1/2 px-6 py-3 border border-olt-border bg-olt-panel/90 backdrop-blur-md rounded-xl shadow-2xl flex items-center gap-6 z-40 transition-all animate-slide-in">
                <span className="text-sm font-bold font-mono text-olt-blue">{selectedOnus.length} ONUs Selected</span>
                <div className="h-4 w-px bg-olt-border" />
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setProfileModalOpen(true)}><FileCode size={13} /> Apply Profile</Button>
                  <Button size="sm" variant="secondary" onClick={bulkReboot} className="text-olt-amber hover:text-white"><RefreshCw size={13} /> Reboot</Button>
                  <Button size="sm" variant="danger" onClick={bulkDeregister}><Trash size={13} /> Deregister</Button>
                  <button onClick={() => setSelectedOnus([])} className="p-1 hover:bg-olt-surface rounded text-olt-muted hover:text-white"><X size={16} /></button>
                </div>
              </div>
            )}

            <Modal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} title="Assign Config Profile" size="sm">
              <div className="space-y-4">
                <p className="text-xs text-olt-muted">Choose a configuration profile to push down to the {selectedOnus.length} selected optical network units (ONUs).</p>
                <div>
                  <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-2">Profile Template</label>
                  <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none">
                    <option value="">Select configuration template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setProfileModalOpen(false)}>Cancel</Button>
                  <Button onClick={applyProfile} variant="primary"><Check size={14} /> Push Profile</Button>
                </div>
              </div>
            </Modal>
          </>
        )}
      </div>
    );
  };

  // T4: ROUTERS & SWITCHES
  const renderRouters = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Core Infrastructure</h2>
          <p className="text-xs text-olt-muted mt-0.5">Manage Cisco, Juniper, and MikroTik routing & switching nodes</p>
        </div>
        <div className="flex gap-2">
          {routerList.length > 0 && (
            <Button variant="secondary" onClick={() => exportToCSV(filteredRouters, 'router-inventory')}>
              <Download size={14} /> Export
            </Button>
          )}
          <Button onClick={openAddRouter}><Plus size={14} /> Add Core Device</Button>
        </div>
      </div>

      {routerList.length === 0 ? (
        <div className="bg-olt-panel border border-olt-border rounded-xl p-10 text-center space-y-4 shadow-xl">
          <Network size={48} className="mx-auto text-olt-muted animate-pulse" />
          <h3 className="text-lg font-bold">No Core Routing Nodes</h3>
          <p className="text-sm text-olt-muted max-w-sm mx-auto">Active core routing/switching registry is blank. Add your core gateways or edge aggregation routers here.</p>
          <Button onClick={openAddRouter}><Plus size={16} /> Register Core Node</Button>
        </div>
      ) : (
        <>
          <FilterBar>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-olt-muted" />
              <input type="text" placeholder="Search by name, IP, model..." value={routerSearch} onChange={e => { setRouterSearch(e.target.value); setRouterPage(1); }} className="w-full pl-10 pr-4 py-2 bg-olt-panel border border-olt-border rounded-lg text-sm focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
            </div>
            <Select value={routerFilter.type} onChange={v => { setRouterFilter(f => ({ ...f, type: v })); setRouterPage(1); }} options={[{ value: 'router', label: 'Routers' }, { value: 'switch', label: 'Switches' }]} placeholder="All Device Types" />
            <Select value={routerFilter.vendor} onChange={v => { setRouterFilter(f => ({ ...f, vendor: v })); setRouterPage(1); }} options={[{ value: 'Juniper', label: 'Juniper' }, { value: 'MikroTik', label: 'MikroTik' }, { value: 'Cisco', label: 'Cisco' }, { value: 'Huawei', label: 'Huawei' }, { value: 'Arista', label: 'Arista' }]} placeholder="All Vendors" />
            <Select value={routerFilter.status} onChange={v => { setRouterFilter(f => ({ ...f, status: v })); setRouterPage(1); }} options={[{ value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }, { value: 'warning', label: 'Warning' }]} placeholder="All Statuses" />
          </FilterBar>

          {selectedRouter ? (
            <RouterDetailView router={selectedRouter} onBack={() => setSelectedRouter(null)} />
          ) : (
            <>
              <DataTable
                columns={[
                  { key: 'name', label: 'Device Name', render: v => <span className="font-mono font-bold text-olt-blue hover:underline">{v}</span> },
                  { key: 'ip', label: 'IP Address', render: v => <span className="font-mono text-xs">{v}</span> },
                  { key: 'deviceType', label: 'Type', render: v => <span className="px-2 py-0.5 bg-olt-surface text-olt-text border border-olt-border rounded text-[10px] font-bold uppercase">{v}</span> },
                  { key: 'vendor', label: 'Vendor', render: v => <span className="px-2 py-0.5 bg-olt-blue/15 text-olt-blue border border-olt-blue/30 rounded text-xs font-bold">{v}</span> },
                  { key: 'model', label: 'Model', render: v => <span className="font-mono text-xs">{v}</span> },
                  { key: 'role', label: 'Role' },
                  { key: 'status', label: 'Status', render: v => <StatusBadge status={v} pulse /> },
                  { key: 'cpu', label: 'CPU Load', render: v => <span className="font-mono">{v}%</span> },
                  { key: 'temp', label: 'Temp', render: v => <span className={`font-mono font-bold ${v > 50 ? 'text-olt-amber' : 'text-olt-green'}`}>{v}°C</span> },
                  { key: 'interfacesCount', label: 'Ports', render: v => <span className="font-mono font-bold">{v}</span> },
                  { key: 'actions', label: 'Actions', render: (_, row) => (
                    <div className="flex gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEditRouter(row)} className="p-1 hover:bg-olt-surface rounded"><Edit2 size={13} className="text-olt-muted hover:text-olt-text" /></button>
                      <button onClick={() => deleteRouter(row.id)} className="p-1 hover:bg-olt-surface rounded"><Trash2 size={13} className="text-olt-red" /></button>
                    </div>
                  ), className: 'text-right' },
                ]}
                data={paginatedRouters}
                onRowClick={setSelectedRouter}
              />
              <Pagination currentPage={routerPage} totalPages={Math.ceil(filteredRouters.length / pageSize)} onPageChange={setRouterPage} />
            </>
          )}
        </>
      )}

      <Modal isOpen={routerModalOpen} onClose={() => setRouterModalOpen(false)} title={routerForm?.id ? 'Edit Core Infrastructure Device' : 'Provision Core Infrastructure Device'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Host Name <span className="text-olt-red">*</span></label>
            <input value={routerForm?.name || ''} onChange={e => setRouterForm({ ...routerForm, name: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" placeholder="e.g. Core-Router-01" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">IP Address <span className="text-olt-red">*</span></label>
            <input value={routerForm?.ip || ''} onChange={e => setRouterForm({ ...routerForm, ip: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none font-mono" placeholder="e.g. 10.0.0.1" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">SSH Port</label>
            <input type="number" value={routerForm?.port || 22} onChange={e => setRouterForm({ ...routerForm, port: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">SNMP Community</label>
            <input value={routerForm?.community || ''} onChange={e => setRouterForm({ ...routerForm, community: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">SSH Username</label>
            <input value={routerForm?.username || ''} onChange={e => setRouterForm({ ...routerForm, username: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">SSH Password</label>
            <input type="password" value={routerForm?.password || ''} onChange={e => setRouterForm({ ...routerForm, password: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Vendor</label>
            <select value={routerForm?.vendor || 'Juniper'} onChange={e => setRouterForm({ ...routerForm, vendor: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none">
              {['Juniper', 'MikroTik', 'Cisco', 'Huawei', 'Arista'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Device Type</label>
            <select value={routerForm?.deviceType || 'router'} onChange={e => setRouterForm({ ...routerForm, deviceType: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none">
              <option value="router">Router</option>
              <option value="switch">Switch</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Model</label>
            <input value={routerForm?.model || ''} onChange={e => setRouterForm({ ...routerForm, model: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" placeholder="e.g. MX240 / CCR1036" />
          </div>
          <div>
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Role / Topology Position</label>
            <select value={routerForm?.role || 'Core'} onChange={e => setRouterForm({ ...routerForm, role: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none">
              {['Core', 'Aggregation', 'Edge', 'Access'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Location Address</label>
            <select value={routerForm?.location || 'DC-Core-01'} onChange={e => setRouterForm({ ...routerForm, location: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:ring-2 focus:ring-olt-blue/50 focus:outline-none">
              {['DC-Core-01', 'DC-Edge-02', 'POP-North', 'POP-South', 'POP-East', 'POP-West', 'CO-Main', 'CO-Backup'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setRouterModalOpen(false)}>Cancel</Button>
          <Button onClick={saveRouter}><Check size={14} /> Save Device</Button>
        </div>
      </Modal>
    </div>
  );

  function RouterDetailView({ router, onBack }) {
    const devInterfaces = routerInterfaces.find(i => i.deviceId === router.id)?.interfaces || [];

    return (
      <div className="space-y-4 animate-fade-in border border-olt-border bg-olt-panel/40 p-5 rounded-xl">
        <div className="flex items-center justify-between border-b border-olt-border pb-3">
          <button onClick={onBack} className="flex items-center gap-2 text-olt-muted hover:text-olt-text transition-colors text-sm font-semibold">
            <ChevronLeft size={16} /> Back to Infrastructure Directory
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => runPingTest(router)}><Activity size={13} /> Ping Test</Button>
            <Button size="sm" variant="secondary" onClick={() => openConsoleShell(router)}><Terminal size={13} /> SSH Console</Button>
            <Button size="sm" variant="secondary" onClick={() => openEditRouter(router)}><Edit2 size={13} /> Edit Config</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-mono text-olt-text">{router.name}</h3>
                <StatusBadge status={router.status} pulse />
              </div>
              <p className="text-xs text-olt-muted font-mono mt-1">Management IP: {router.ip}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <span className="block text-[10px] uppercase font-bold text-olt-muted">Vendor</span>
                <span className="text-sm font-bold">{router.vendor}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-olt-muted">Model</span>
                <span className="text-sm font-mono">{router.model || 'Unknown'}</span>
              </div>
              <div className="mt-2">
                <span className="block text-[10px] uppercase font-bold text-olt-muted">Node Role</span>
                <span className="text-sm font-bold">{router.role}</span>
              </div>
              <div className="mt-2">
                <span className="block text-[10px] uppercase font-bold text-olt-muted">Uptime</span>
                <span className="text-sm font-mono text-olt-green">{formatUptime(router.uptime)}</span>
              </div>
            </div>
          </div>

          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 space-y-4 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">Hardware Telemetry Metrics</h4>
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                <span className="text-olt-text">CPU Core Utilization</span>
                <span className={router.cpu > 70 ? 'text-olt-red font-bold' : 'text-olt-muted'}>{router.cpu}%</span>
              </div>
              <div className="h-2 bg-olt-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${router.cpu}%`, backgroundColor: router.cpu > 70 ? COLORS.red : COLORS.green }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                <span className="text-olt-text">RAM Memory Buffer</span>
                <span className={router.memory > 80 ? 'text-olt-red font-bold' : 'text-olt-muted'}>{router.memory}%</span>
              </div>
              <div className="h-2 bg-olt-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${router.memory}%`, backgroundColor: router.memory > 80 ? COLORS.red : router.memory > 60 ? COLORS.amber : COLORS.blue }} />
              </div>
            </div>
          </div>

          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 flex flex-col justify-between shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">NOC Sensor Readout</h4>
            <div className="grid grid-cols-2 gap-4 my-auto">
              <div className="text-center p-3 bg-olt-surface/30 border border-olt-border rounded-lg">
                <span className="block text-2xs uppercase text-olt-muted">Core Temperature</span>
                <span className={`text-xl font-bold font-mono ${router.temp > 50 ? 'text-olt-amber' : 'text-olt-green'}`}>{router.temp}°C</span>
              </div>
              <div className="text-center p-3 bg-olt-surface/30 border border-olt-border rounded-lg">
                <span className="block text-2xs uppercase text-olt-muted">Total Interfaces</span>
                <span className="text-xl font-bold font-mono text-olt-blue">{devInterfaces.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scan interfaces banner if empty */}
        {devInterfaces.length === 0 && (
          <div className="bg-olt-panel border border-olt-border rounded-xl p-6 text-center space-y-3">
            <AlertCircle size={24} className="mx-auto text-olt-amber animate-pulse" />
            <h4 className="text-sm font-bold">Interfaces Table Empty</h4>
            <p className="text-xs text-olt-muted max-w-md mx-auto">This router/switch does not contain interface telemetry in database. Run SNMP GetBulk request to scan physical port layouts.</p>
            <Button size="sm" onClick={() => syncRouterInterfaces(router.id)} loading={syncingRouterId === router.id}>
              <RefreshCcw size={13} className={syncingRouterId === router.id ? 'animate-spin' : ''} /> Scan Interfaces via SNMP
            </Button>
          </div>
        )}

        {devInterfaces.length > 0 && (
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-olt-border/30 pb-2 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted">Core Port Interfaces List</h3>
              <button onClick={() => syncRouterInterfaces(router.id)} disabled={syncingRouterId === router.id} className="text-xs text-olt-blue hover:underline flex items-center gap-1 font-semibold">
                <RefreshCcw size={12} className={syncingRouterId === router.id ? 'animate-spin' : ''} /> Rescan Ports
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-olt-border text-left text-xs font-semibold text-olt-muted uppercase">
                    <th className="px-4 py-2.5">Port Name</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">Link Speed</th>
                    <th className="px-4 py-2.5">Admin Status</th>
                    <th className="px-4 py-2.5">Oper Status</th>
                    <th className="px-4 py-2.5 text-right">Throughput Load (Rx/Tx)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olt-border/30 font-mono text-xs">
                  {devInterfaces.map((intf, idx) => (
                    <tr key={idx} className="table-row-hover">
                      <td className="px-4 py-2.5 text-olt-text font-bold">{intf.name}</td>
                      <td className="px-4 py-2.5 text-olt-muted font-sans text-2xs">{intf.desc}</td>
                      <td className="px-4 py-2.5 font-bold text-cyan-400">{intf.speed}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={intf.admin} /></td>
                      <td className="px-4 py-2.5"><StatusBadge status={intf.oper} /></td>
                      <td className="px-4 py-2.5 text-right font-semibold text-olt-green">
                        {intf.oper === 'up' ? `${intf.rxMbps} Mbps / ${intf.txMbps} Mbps` : '0 Mbps / 0 Mbps'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // T5: ALARM CENTER
  const renderAlarms = () => {
    const severities = ['all', 'critical', 'major', 'minor', 'warning'];
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Alarm Management Center</h2>
            <p className="text-xs text-olt-muted mt-0.5">Acknowledge, clear, and trace hardware faults</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setAlarmAudio(prev => !prev)} className="p-2 border border-olt-border bg-olt-panel rounded-lg hover:bg-olt-surface text-olt-muted hover:text-olt-text transition-colors">
              {alarmAudio ? <Volume2 size={16} className="text-olt-green animate-pulse" /> : <VolumeX size={16} />}
            </button>
            {alarmList.length > 0 && (
              <>
                <Button variant="secondary" onClick={acknowledgeAll}>Acknowledge All</Button>
                <Button variant="secondary" onClick={() => exportToCSV(filteredAlarms, 'alarm-logs')}><Download size={14} /> Export</Button>
              </>
            )}
          </div>
        </div>

        {alarmList.length === 0 ? (
          <div className="bg-olt-panel border border-olt-border rounded-xl p-10 text-center space-y-2 shadow-xl">
            <CheckCircle size={48} className="mx-auto text-olt-green animate-pulse" />
            <h3 className="text-lg font-bold">All Systems Nominal</h3>
            <p className="text-sm text-olt-muted max-w-sm mx-auto font-mono">Zero alarms or events registered in active buffer queue.</p>
          </div>
        ) : (
          <>
            {/* Severity Tabs */}
            <div className="flex border-b border-olt-border pb-px">
              {severities.map(sev => (
                <button
                  key={sev}
                  onClick={() => { setAlarmFilter(f => ({ ...f, severity: sev === 'all' ? '' : sev })); setAlarmPage(1); }}
                  className={`px-4 py-2 border-b-2 text-xs font-bold uppercase tracking-wider transition-all ${((!alarmFilter.severity && sev === 'all') || alarmFilter.severity === sev) ? 'border-olt-blue text-olt-blue bg-olt-blue/5 font-semibold' : 'border-transparent text-olt-muted hover:text-olt-text hover:border-olt-border'}`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <FilterBar>
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-olt-muted" />
                <input type="text" placeholder="Search by OLT, alarm type or description..." value={alarmSearch} onChange={e => { setAlarmSearch(e.target.value); setAlarmPage(1); }} className="w-full pl-10 pr-4 py-2 bg-olt-panel border border-olt-border rounded-lg text-sm focus:ring-2 focus:ring-olt-blue/50 focus:outline-none" />
              </div>
              <Select value={alarmFilter.status} onChange={v => { setAlarmFilter(f => ({ ...f, status: v })); setAlarmPage(1); }} options={[{ value: 'active', label: 'Active Alarms Only' }, { value: 'acknowledged', label: 'Acknowledged Only' }]} placeholder="All Alarm States" />
            </FilterBar>

            <DataTable
              columns={[
                {
                  key: 'severity',
                  label: 'Sev',
                  render: v => {
                    const color = SEVERITY_COLORS[v] || COLORS.gray;
                    return (
                      <span className="w-2.5 h-2.5 rounded-full block mx-auto" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} title={v.toUpperCase()} />
                    );
                  },
                  className: 'w-[40px] text-center'
                },
                { key: 'time', label: 'Trigger Time', render: v => <span className="font-mono text-xs">{formatDate(v)}</span> },
                {
                  key: 'oltName',
                  label: 'Source Node',
                  render: (_, row) => (
                    <div>
                      <span className="font-mono font-bold block">{row.oltName}</span>
                      <span className="text-3xs text-olt-muted font-mono">{row.oltIp}</span>
                    </div>
                  )
                },
                {
                  key: 'port',
                  label: 'Resource Link',
                  render: (_, row) => (
                    <div className="font-mono text-xs">
                      <span>PON {row.port || 'Chassis'}</span>
                      {row.onuSn && <span className="text-olt-muted block text-3xs">{row.onuSn} ({row.onuName || 'ONT'})</span>}
                    </div>
                  )
                },
                { key: 'alarmType', label: 'Alarm Code', render: v => <span className="font-mono px-2 py-0.5 bg-olt-surface text-olt-muted border border-olt-border rounded font-semibold text-2xs">{v}</span> },
                { key: 'description', label: 'Fault Description', className: 'max-w-[300px] truncate' },
                { key: 'status', label: 'State', render: v => <StatusBadge status={v} /> },
                {
                  key: 'actions',
                  label: 'Resolve',
                  render: (_, row) => (
                    <div className="flex gap-1.5 justify-end">
                      {row.status === 'active' && (
                        <button onClick={() => acknowledgeAlarm(row.id)} className="px-2 py-1 bg-olt-blue/15 hover:bg-olt-blue text-olt-blue hover:text-white rounded border border-olt-blue/30 text-2xs font-semibold" title="Acknowledge Alert">Ack</button>
                      )}
                      <button onClick={() => clearAlarm(row.id)} className="p-1 hover:bg-olt-surface rounded text-olt-red" title="Clear Event Log"><Trash size={13} /></button>
                    </div>
                  ),
                  className: 'text-right'
                }
              ]}
              data={paginatedAlarms}
            />

            <Pagination currentPage={alarmPage} totalPages={Math.ceil(filteredAlarms.length / pageSize)} onPageChange={setAlarmPage} />
          </>
        )}
      </div>
    );
  };

  // T6: SCRIPT CONFIGURATION
  const renderConfig = () => {
    const handleTemplateClick = (tmpl) => {
      setConfigActiveTemplate(tmpl);
      setConfigCode(tmpl.description);
    };

    const handleVariableChange = (name, val) => {
      setConfigVariables(prev => ({ ...prev, [name]: val }));
    };

    const finalScript = replaceCodeVariables();

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        {/* Left Library Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted mb-3 border-b border-olt-border/30 pb-2">Command Templates</h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {templates.map(tmpl => (
                <div
                  key={tmpl.id}
                  onClick={() => handleTemplateClick(tmpl)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${configActiveTemplate.id === tmpl.id ? 'bg-olt-blue/10 border-olt-blue text-white shadow-md' : 'bg-olt-surface/20 border-olt-border/60 hover:bg-olt-surface/50 text-olt-muted hover:text-olt-text'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{tmpl.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-olt-surface border border-olt-border rounded text-olt-muted uppercase font-mono font-semibold">{tmpl.vendor}</span>
                  </div>
                  <span className="text-3xs block text-olt-muted uppercase tracking-wider font-semibold mt-1 font-mono">{tmpl.category}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Variables form */}
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted mb-3 border-b border-olt-border/30 pb-2">Template Parameters</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-3xs font-bold uppercase tracking-wider text-olt-muted mb-1 font-mono">VLAN ID</label>
                <input type="number" value={configVariables.VLAN_ID} onChange={e => handleVariableChange('VLAN_ID', e.target.value)} className="w-full px-2.5 py-1.5 bg-olt-surface border border-olt-border rounded text-xs text-olt-text font-mono focus:outline-none focus:ring-1 focus:ring-olt-blue" />
              </div>
              <div>
                <label className="block text-3xs font-bold uppercase tracking-wider text-olt-muted mb-1 font-mono">ONU Profile Name</label>
                <input value={configVariables.PROFILE_NAME} onChange={e => handleVariableChange('PROFILE_NAME', e.target.value)} className="w-full px-2.5 py-1.5 bg-olt-surface border border-olt-border rounded text-xs text-olt-text font-mono focus:outline-none focus:ring-1 focus:ring-olt-blue" />
              </div>
              <div>
                <label className="block text-3xs font-bold uppercase tracking-wider text-olt-muted mb-1 font-mono">Remote IP Override</label>
                <input value={configVariables.TARGET_IP} onChange={e => handleVariableChange('TARGET_IP', e.target.value)} className="w-full px-2.5 py-1.5 bg-olt-surface border border-olt-border rounded text-xs text-olt-text font-mono focus:outline-none focus:ring-1 focus:ring-olt-blue" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Editor Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg flex flex-col h-full justify-between animate-fade-in">
            <div>
              <div className="flex items-center justify-between border-b border-olt-border/30 pb-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-olt-text uppercase tracking-wider">{configActiveTemplate.name} Editor</h3>
                  <p className="text-3xs text-olt-muted mt-0.5 font-mono">Category: {configActiveTemplate.category}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setConfigDiffModalOpen(true)}><FileCode size={13} /> Diff Preview</Button>
                  <Button size="sm" variant="primary" onClick={runConfiguration}><Play size={13} /> Push to Chassis</Button>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="grid grid-cols-12 bg-black/60 rounded-xl overflow-hidden border border-olt-border p-4 font-mono text-xs min-h-[35vh]">
                <div className="col-span-1 text-right text-olt-border select-none border-r border-olt-border/40 pr-3 font-semibold">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={configCode}
                  onChange={e => setConfigCode(e.target.value)}
                  className="col-span-11 pl-4 bg-transparent border-none text-olt-green resize-none outline-none font-mono text-xs focus:ring-0 leading-normal"
                  rows={12}
                />
              </div>
              
              <div className="mt-4 p-3 bg-olt-surface/20 border border-olt-border rounded-lg">
                <span className="block text-3xs font-bold uppercase tracking-wider text-olt-muted mb-2 font-mono">Generated Switch command script:</span>
                <pre className="text-2xs font-mono text-cyan-400 bg-black/30 p-2.5 rounded overflow-x-auto whitespace-pre-wrap">
                  {finalScript}
                </pre>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-olt-border/30">
              <Select value={configTargetOlt} onChange={configTargetOlt} options={oltList.map(o => ({ value: o.id, label: `${o.name} (${o.ip})` }))} placeholder="Select Target Distribution OLT..." className="text-xs" />
              <Button onClick={runConfiguration} variant="primary" size="sm" className="font-bold"><Terminal size={14} /> Apply CLI Commands</Button>
            </div>
          </div>
        </div>

        {/* Diff Preview Modal */}
        <Modal isOpen={configDiffModalOpen} onClose={() => setConfigDiffModalOpen(false)} title="CLI Dry-Run Diff Preview" size="lg">
          <div className="space-y-4">
            <p className="text-xs text-olt-muted">Simulating differences between active hardware configuration and modified CLI script parameters:</p>
            <div className="bg-black/80 font-mono text-xs p-4 rounded-xl border border-olt-border overflow-x-auto">
              <div className="text-olt-muted"># Show running config differences ...</div>
              <div className="text-olt-red bg-olt-red/10 px-2 py-0.5 my-1">- vlan 99 database name VLAN-OLD</div>
              <div className="text-olt-green bg-olt-green/10 px-2 py-0.5 my-1">+ vlan {configVariables.VLAN_ID} database name VLAN-NEW</div>
              <div className="text-olt-red bg-olt-red/10 px-2 py-0.5 my-1">- gpon onu profile-name OLD-PROFILE</div>
              <div className="text-olt-green bg-olt-green/10 px-2 py-0.5 my-1">+ gpon onu profile-name {configVariables.PROFILE_NAME}</div>
              <div className="text-olt-muted bg-olt-surface/30 px-2 py-0.5 my-1">  gpon snmp Community public read</div>
              <div className="text-olt-green bg-olt-green/10 px-2 py-0.5 my-1">+ host logging destination {configVariables.TARGET_IP}</div>
            </div>
            <div className="flex justify-end pt-4 border-t border-olt-border/30">
              <Button onClick={() => setConfigDiffModalOpen(false)} variant="secondary">Close Preview</Button>
            </div>
          </div>
        </Modal>

        {/* SSH Connection console outputs modal */}
        <Modal isOpen={configModalOpen} onClose={() => !configApplying && setConfigModalOpen(false)} title="SSH/Telnet Transaction Tunnel" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-olt-muted font-semibold">Transmission Progress:</span>
              <span className="text-xs font-mono font-bold text-olt-blue">{configProgress}%</span>
            </div>
            <div className="h-2 bg-olt-surface rounded-full overflow-hidden border border-olt-border">
              <div className="h-full bg-olt-blue transition-all duration-300" style={{ width: `${configProgress}%` }} />
            </div>

            <div className="bg-black rounded-lg p-3 border border-olt-border font-mono text-2xs min-h-[160px] max-h-[250px] overflow-y-auto text-olt-green space-y-1">
              {configLogs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">{log}</div>
              ))}
              {configApplying && (
                <div className="flex items-center gap-1.5 text-olt-muted font-bold animate-pulse mt-1">
                  <RefreshCw size={10} className="animate-spin text-olt-blue" /> Wait, executing block...
                </div>
              )}
              <div ref={consoleBottomRef} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button disabled={configApplying} onClick={() => setConfigModalOpen(false)} variant="secondary">Close Terminal</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  // T7: ANALYTICAL REPORTS
  const renderReports = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        {/* Left parameters */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">NOC Reports Parameters</h3>
            <div>
              <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-2">Select Report Category</label>
              <div className="space-y-1">
                {[
                  { id: 'traffic', label: 'Chassis Ingress/Egress' },
                  { id: 'signals', label: 'ONU Rx Optical Levels' },
                  { id: 'faults', label: 'Fault & Recovery Statistics' },
                  { id: 'uptime', label: 'Distribution Availability' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setReportsType(item.id)}
                    className={`w-full text-left px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${reportsType === item.id ? 'bg-olt-blue/10 border-olt-blue text-white font-bold' : 'bg-olt-surface/20 border-olt-border/40 hover:bg-olt-surface/40 text-olt-muted hover:text-olt-text'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-2">Sampling Range</label>
              <select value={reportsRange} onChange={e => setReportsRange(e.target.value)} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none">
                <option value="today">Today (24h loop)</option>
                <option value="7d">Last 7 days (rolling)</option>
                <option value="30d">Last 30 days (archive)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-olt-border/30 flex gap-2">
              <Button disabled={reportsExporting || (oltList.length === 0 && routerList.length === 0)} onClick={() => exportReport('pdf')} size="sm" variant="secondary" className="flex-1">
                Export PDF
              </Button>
              <Button disabled={reportsExporting || (oltList.length === 0 && routerList.length === 0)} onClick={() => exportReport('excel')} size="sm" variant="secondary" className="flex-1">
                Export Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Right chart visualizer */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg min-h-[40vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-olt-border/30 pb-2 mb-4">
                <h3 className="text-sm font-bold text-olt-text uppercase tracking-wider">
                  {reportsType === 'traffic' ? 'Bandwidth Load Analysis' : reportsType === 'signals' ? 'ONT Optical Threshold Distribution' : reportsType === 'faults' ? 'Fault Accumulation Index' : 'Availability Index'}
                </h3>
                <span className="text-2xs font-mono font-bold px-2 py-0.5 bg-olt-surface rounded text-olt-blue uppercase border border-olt-border">{reportsRange} sampling</span>
              </div>

              {reportsExporting ? (
                <div className="h-[250px] flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-olt-blue" />
                  <span className="text-xs font-mono font-bold text-olt-muted animate-pulse">Compiling database... generating analytics file...</span>
                </div>
              ) : (oltList.length === 0 && routerList.length === 0) ? (
                <div className="h-[250px] flex items-center justify-center text-xs text-olt-muted font-mono">No data points (Register chassis first)</div>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {reportsType === 'traffic' ? (
                      <AreaChart data={trafficHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="time" stroke="#8b949e" fontSize={9} />
                        <YAxis stroke="#8b949e" fontSize={9} />
                        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' }} />
                        <Area type="monotone" dataKey="inbound" name="Inbound (Gbps)" stroke={COLORS.blue} fill={`${COLORS.blue}18`} />
                        <Area type="monotone" dataKey="outbound" name="Outbound (Gbps)" stroke={COLORS.green} fill={`${COLORS.green}18`} />
                      </AreaChart>
                    ) : reportsType === 'signals' ? (
                      <BarChart data={[
                        { range: '>-25 dBm (Good)', count: onuList.filter(o => parseFloat(o.rxPower) > -25).length },
                        { range: '-25 to -27 dBm (Marginal)', count: onuList.filter(o => parseFloat(o.rxPower) <= -25 && parseFloat(o.rxPower) > -27).length },
                        { range: '<-27 dBm (Poor)', count: onuList.filter(o => parseFloat(o.rxPower) <= -27 && parseFloat(o.rxPower) !== 0).length }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="range" stroke="#8b949e" fontSize={9} />
                        <YAxis stroke="#8b949e" fontSize={9} />
                        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' }} />
                        <Bar dataKey="count" name="ONU Count" radius={[4, 4, 0, 0]}>
                          <Cell fill={COLORS.green} />
                          <Cell fill={COLORS.amber} />
                          <Cell fill={COLORS.red} />
                        </Bar>
                      </BarChart>
                    ) : reportsType === 'faults' ? (
                      <BarChart data={alarmTimelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="time" stroke="#8b949e" fontSize={9} />
                        <YAxis stroke="#8b949e" fontSize={9} />
                        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' }} />
                        <Bar dataKey="critical" name="Critical" stackId="a" fill={COLORS.red} />
                        <Bar dataKey="major" name="Major" stackId="a" fill={COLORS.amber} />
                        <Bar dataKey="minor" name="Minor" stackId="a" fill={COLORS.blue} />
                      </BarChart>
                    ) : (
                      <AreaChart data={Array.from({ length: 12 }).map((_, i) => ({ month: `M-${i + 1}`, uptime: 98 + Math.random() * 1.9 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="month" stroke="#8b949e" fontSize={9} />
                        <YAxis domain={[95, 100]} stroke="#8b949e" fontSize={9} />
                        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' }} />
                        <Area type="monotone" dataKey="uptime" name="System Availability (%)" stroke={COLORS.cyan} fill={`${COLORS.cyan}18`} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-olt-surface/10 border border-olt-border rounded-lg flex items-center justify-between text-xs">
              <span className="text-olt-muted">Calculated Average SLA conformance:</span>
              <strong className="text-olt-green font-mono">99.88% (Exceeds SLA threshold 99.5%)</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // T8: USER & AUDIT LOGS
  const renderUsers = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-olt-border/30 pb-2 mb-4">
              <h3 className="text-sm font-bold text-olt-text uppercase tracking-wider">Access Authorization Directory</h3>
              <Button size="sm" onClick={openAddUser}><Plus size={12} /> New Operator</Button>
            </div>

            <DataTable
              columns={[
                {
                  key: 'name',
                  label: 'Full Name',
                  render: (_, row) => (
                    <div>
                      <span className="font-semibold block">{row.name}</span>
                      <span className="text-3xs text-olt-muted font-mono">{row.email}</span>
                    </div>
                  )
                },
                {
                  key: 'role',
                  label: 'Group Role',
                  render: v => {
                    const badgeColors = {
                      admin: 'bg-olt-blue/15 text-olt-blue border-olt-blue/30',
                      engineer: 'bg-olt-green/15 text-olt-green border-olt-green/30',
                      viewer: 'bg-olt-border/35 text-olt-muted border-olt-border'
                    };
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-3xs font-bold border uppercase tracking-wider ${badgeColors[v] || badgeColors.viewer}`}>
                        {v}
                      </span>
                    );
                  }
                },
                { key: 'lastLogin', label: 'Last Login Timestamp', render: v => <span className="font-mono text-2xs text-olt-muted">{formatDate(v)}</span> },
                {
                  key: 'actions',
                  label: 'Modify',
                  render: (_, row) => (
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => openEditUser(row)} className="p-1 hover:bg-olt-surface rounded text-olt-muted hover:text-white" title="Edit account"><Edit2 size={13} /></button>
                      <button onClick={() => deleteUser(row.id)} className="p-1 hover:bg-olt-surface rounded text-olt-red" title="Revoke access"><Trash2 size={13} /></button>
                    </div>
                  ),
                  className: 'text-right'
                }
              ]}
              data={userList}
            />
          </div>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-olt-text uppercase tracking-wider mb-4 border-b border-olt-border/30 pb-2">NOC Transaction Audit Logs</h3>
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {activityLog.length === 0 ? (
                <div className="py-12 text-center text-xs text-olt-muted font-mono">No transaction log entries</div>
              ) : (
                activityLog.map(log => (
                  <div key={log.id} onClick={() => setExpandedAuditLog(expandedAuditLog === log.id ? null : log.id)}
                    className="p-3 bg-olt-surface/10 hover:bg-olt-surface/30 border border-olt-border rounded-lg cursor-pointer transition-all font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-olt-blue">{log.action}</span>
                      <span className="text-[10px] text-olt-muted">{formatDate(log.timestamp)}</span>
                    </div>
                    <div className="flex justify-between text-3xs text-olt-muted mt-1 uppercase font-semibold">
                      <span>Operator: {log.user}</span>
                      <span>ID: #{log.id}</span>
                    </div>

                    {expandedAuditLog === log.id && (
                      <div className="mt-2.5 pt-2.5 border-t border-olt-border/40 text-2xs text-olt-text bg-black/40 p-2.5 rounded space-y-1 animate-slide-in">
                        <div><strong>Action Type:</strong> {log.action}</div>
                        <div><strong>Payload Description:</strong> {log.detail}</div>
                        <div><strong>Audit Status:</strong> Success (Code 0x0)</div>
                        <div className="text-[10px] text-olt-muted">Trace ID: noc-txn-trace-{log.id}-xyz</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title={userForm?.id ? 'Edit Operator Account' : 'Provision Operator Account'} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Operator Full Name</label>
              <input value={userForm?.name || ''} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none" placeholder="Sarah Chen" />
            </div>
            <div>
              <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Corporate Email Address</label>
              <input value={userForm?.email || ''} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none" placeholder="s.chen@isp.net" />
            </div>
            <div>
              <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Security Access Password {userForm?.id && <span className="text-3xs text-olt-muted italic">(Leave blank to keep current)</span>}</label>
              <input type="password" value={userForm?.password || ''} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none font-mono" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1">Security Group Role</label>
              <select value={userForm?.role || 'engineer'} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none">
                <option value="admin">Administrator (Write & Command Exec)</option>
                <option value="engineer">NOC Engineer (Write configs)</option>
                <option value="viewer">Viewer (Read-only query access)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setUserModalOpen(false)}>Cancel</Button>
              <Button onClick={saveUser} variant="primary"><Check size={14} /> Commit User</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  // T9: SETTINGS
  const renderSettings = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">Global SNMP Telemetry Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1 font-mono">SNMP Query Port</label>
                <input type="number" value={settings.snmpPort} onChange={e => setSettings({ ...settings, snmpPort: parseInt(e.target.value) || 0 })} disabled={currentUser?.role !== 'admin'} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none font-mono disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1 font-mono">SNMP Read Community</label>
                <input value={settings.snmpCommunity} onChange={e => setSettings({ ...settings, snmpCommunity: e.target.value })} disabled={currentUser?.role !== 'admin'} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none font-mono disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">NOC Integration Webhooks</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1 font-mono">Telegram Bot API Token</label>
                <input value={settings.telegramBot} onChange={e => setSettings({ ...settings, telegramBot: e.target.value })} disabled={currentUser?.role !== 'admin'} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-olt-muted uppercase tracking-wider mb-1 font-mono">Telegram Target Chat ID</label>
                <input value={settings.telegramChatId} onChange={e => setSettings({ ...settings, telegramChatId: e.target.value })} disabled={currentUser?.role !== 'admin'} className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
            </div>
            <div className="flex justify-between items-center bg-olt-surface/20 border border-olt-border rounded-lg p-3 text-xs mt-2">
              <span className="text-olt-muted">Verify Telegram payload routing:</span>
              <Button size="xs" onClick={() => testNotification('telegram')} disabled={currentUser?.role !== 'admin'} variant="secondary">Test Telegram Connection</Button>
            </div>
          </div>

          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-olt-red border-b border-olt-border/30 pb-2">NOC Database Operations</h3>
            <p className="text-xs text-olt-muted">Load default mock datasets for testing layouts, or clear the environment registry to configure your own core nodes.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={loadMockTelemetry} disabled={currentUser?.role !== 'admin'} variant="secondary" className="flex-1 font-semibold">
                <RefreshCcw size={14} /> Load Telemetry Mock Data
              </Button>
              <Button onClick={wipeAllTelemetry} disabled={currentUser?.role !== 'admin'} variant="danger" className="flex-1 font-semibold">
                <Trash size={14} /> Wipe Database (Start Clean)
              </Button>
            </div>
          </div>

          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">Telemetry Polling Rates</h3>
            <div>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-olt-text">SNMP Loop Interval (Seconds)</span>
                <span className="font-mono font-bold text-olt-blue">{settings.pollingInterval}s</span>
              </div>
              <input type="range" min="10" max="300" step="10" value={settings.pollingInterval} onChange={e => setSettings({ ...settings, pollingInterval: parseInt(e.target.value) || 10 })} disabled={currentUser?.role !== 'admin'} className="w-full bg-olt-surface outline-none cursor-pointer h-1 rounded-lg accent-olt-blue disabled:opacity-50 disabled:cursor-not-allowed" />
              <p className="text-3xs text-olt-muted mt-1">Lower polling rates increase traffic load but offer higher dashboard granularity.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-olt-border/20">
            <Button onClick={saveSettings} variant="primary"><Save size={14} /> Save NOC Settings</Button>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-olt-panel border border-olt-border rounded-xl p-5 shadow-lg text-xs space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-olt-muted border-b border-olt-border/30 pb-2">System Diagnostics</h3>
            <div>
              <span className="text-olt-muted block">System Core Software</span>
              <strong className="text-olt-text font-mono">v1.2.6-Production</strong>
            </div>
            <div>
              <span className="text-olt-muted block">API Engine Latency</span>
              <strong className="text-olt-green font-mono">14ms (Healthy)</strong>
            </div>
            <div>
              <span className="text-olt-muted block">Active SNMP Channels</span>
              <strong className="text-olt-blue font-mono">{oltList.length + routerList.length} sockets open</strong>
            </div>
            <div className="pt-2 border-t border-olt-border/30">
              <Button size="sm" variant="secondary" className="w-full flex items-center justify-center gap-1.5"><ExternalLink size={12} /> Clear SNMP Cache</Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDERS SHELL LAYOUT ====================
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('All notifications marked read', 'success');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-olt-bg text-olt-text grid-pattern flex items-center justify-center p-4 selection:bg-olt-blue selection:text-white">
        <div className="w-full max-w-md bg-olt-panel border border-olt-border rounded-2xl shadow-2xl p-8 space-y-6 relative overflow-hidden backdrop-blur-md">
          {/* Top glowing ambient effect */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-olt-blue to-transparent shadow-[0_0_20px_rgba(0,170,255,0.8)]" />
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-olt-blue/15 border border-olt-blue/30 rounded-xl text-olt-blue font-bold text-xs tracking-wider uppercase shadow-inner">
              <Shield size={12} /> NOC SECURE GATEWAY
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-olt-text">ISP-Device-Dashboard_BY_Sabuj</h2>
            <p className="text-xs text-olt-muted">Enter administrative credentials to establish secure session</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-olt-red/10 border border-olt-red/30 rounded-lg text-xs text-olt-red font-semibold flex items-center gap-2 animate-pulse">
                <AlertTriangle size={14} /> {loginError}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="block text-3xs font-bold text-olt-muted uppercase tracking-wider">Corporate Email Address</label>
              <input 
                type="email" 
                value={loginForm.email} 
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} 
                className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none focus:border-olt-blue/50 focus:ring-1 focus:ring-olt-blue/30 transition-all font-mono" 
                placeholder="operator@isp.net"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-3xs font-bold text-olt-muted uppercase tracking-wider">Security Access Password</label>
              <input 
                type="password" 
                value={loginForm.password} 
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} 
                className="w-full px-3 py-2 bg-olt-surface border border-olt-border rounded-lg text-sm text-olt-text focus:outline-none focus:border-olt-blue/50 focus:ring-1 focus:ring-olt-blue/30 transition-all font-mono" 
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" loading={loginLoading} disabled={loginLoading} className="w-full font-bold uppercase py-2.5 mt-2">
              <Check size={16} /> Authenticate Session
            </Button>
          </form>

          {/* Credentials Helper Card */}
          <div className="pt-4 border-t border-olt-border/30 mt-6 text-[11px] space-y-2">
            <span className="font-bold text-olt-muted block uppercase tracking-wider text-3xs">Administrative Testing Credentials:</span>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-olt-muted bg-olt-surface/30 p-2 rounded-lg border border-olt-border/40">
              <div>
                <strong className="text-olt-blue">Admin role:</strong>
                <div className="mt-0.5">admin@isp.net</div>
                <div>Pass: admin123</div>
              </div>
              <div>
                <strong className="text-olt-green">Engineer role:</strong>
                <div className="mt-0.5">m.johnson@isp.net</div>
                <div>Pass: engineer123</div>
              </div>
            </div>
            <p className="text-3xs text-olt-muted/60 text-center italic mt-2">Secure encrypted channel active. All activities are recorded in the central transaction log.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-olt-bg text-olt-text grid-pattern flex flex-col justify-between font-sans selection:bg-olt-blue selection:text-white">
      <div>
        {/* Header Block */}
        <header className="bg-olt-panel border-b border-olt-border h-14 flex items-center justify-between px-4 z-30 sticky top-0 shadow-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1 hover:bg-olt-surface rounded-lg transition-colors text-olt-muted hover:text-white">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-olt-blue/15 border border-olt-blue/30 rounded-lg text-olt-blue font-bold text-sm tracking-tight shadow-md">NOC</span>
              <h1 className="font-bold text-sm tracking-wider uppercase font-sans hidden sm:block">ISP-Device-Dashboard_BY_Sabuj</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Global search */}
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-olt-muted" />
              <input
                type="text"
                placeholder="Search index..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'olts' && activeTab !== 'dashboard') {
                    setActiveTab('olts');
                  }
                }}
                className="pl-9 pr-4 py-1 bg-olt-bg border border-olt-border rounded-lg text-xs focus:ring-1 focus:ring-olt-blue/40 focus:outline-none w-52 text-olt-text font-mono"
              />
            </div>

            <button onClick={() => setAlarmAudio(!alarmAudio)} className="p-1.5 hover:bg-olt-surface rounded-lg transition-colors text-olt-muted hover:text-white" title={alarmAudio ? "Audio alert is ACTIVE" : "Audio alert is MUTED"}>
              {alarmAudio ? <Volume2 size={16} className="text-olt-green animate-pulse" /> : <VolumeX size={16} />}
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)} className="p-1.5 hover:bg-olt-surface rounded-lg transition-colors text-olt-muted hover:text-white relative">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-olt-red text-[9px] font-bold rounded-full flex items-center justify-center text-white scale-90 border border-olt-panel">{unreadCount}</span>
                )}
              </button>

              {notificationsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-olt-panel border border-olt-border rounded-xl shadow-2xl z-50 animate-slide-in p-2 text-xs">
                  <div className="flex items-center justify-between border-b border-olt-border/30 pb-2 mb-2 px-2">
                    <span className="font-bold text-olt-text uppercase tracking-wider">NOC Alerts ({unreadCount})</span>
                    <button onClick={markAllNotificationsRead} className="text-3xs text-olt-blue hover:underline">Mark all read</button>
                  </div>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-olt-muted font-mono">No new NOC system log notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${notif.read ? 'bg-olt-surface/10 border-transparent text-olt-muted' : 'bg-olt-surface/30 border-olt-border text-olt-text hover:border-olt-blue/30'}`}>
                          <div className="flex items-center justify-between font-bold">
                            <span className={notif.severity === 'critical' ? 'text-olt-red font-semibold' : 'text-olt-text'}>{notif.title}</span>
                            <span className="text-3xs text-olt-muted font-mono">{new Date(notif.time).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-3xs text-olt-muted mt-1 leading-normal">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-olt-border/30 pt-2 mt-2 text-center">
                    <button onClick={() => setNotificationsDropdownOpen(false)} className="text-olt-muted hover:text-white font-semibold">Close Panel</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-l border-olt-border pl-4">
              <div className="w-7 h-7 rounded-full bg-olt-blue/15 border border-olt-blue/40 flex items-center justify-center text-olt-blue font-bold text-[10px] uppercase shadow-inner" title={`${currentUser?.name} (${currentUser?.role})`}>
                {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'OP'}
              </div>
              <div className="hidden lg:block text-left leading-tight mr-1">
                <span className="block text-xs font-bold text-olt-text">{currentUser?.name || 'Operator'}</span>
                <span className="block text-3xs text-olt-muted font-mono capitalize">{currentUser?.role || 'Viewer'} mode</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="p-1.5 hover:bg-olt-surface hover:text-olt-red rounded-lg transition-colors text-olt-muted flex items-center justify-center"
                title="Log Out of NOC Session"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Workspace Shell */}
        <div className="flex min-h-[calc(100vh-4.5rem)]">
          <aside className={`bg-olt-panel border-r border-olt-border flex flex-col justify-between transition-all duration-300 z-20 ${sidebarCollapsed ? 'w-14' : 'w-56'}`}>
            <nav className="p-2 space-y-1">
              {TABS.map(tab => {
                const TabIcon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSelectedOlt(null); setSelectedRouter(null); }}
                    className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg border transition-all ${isSelected ? 'bg-olt-blue/10 border-olt-blue text-white font-semibold shadow-md' : 'bg-transparent border-transparent text-olt-muted hover:text-olt-text hover:bg-olt-surface/30'}`}
                    title={tab.label}
                  >
                    <TabIcon size={16} className={isSelected ? 'text-olt-blue' : ''} />
                    {!sidebarCollapsed && <span className="text-xs uppercase tracking-wider font-bold">{tab.label}</span>}
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-olt-border/30 text-center font-mono text-[9px] text-olt-border">
              {!sidebarCollapsed && <span>NOC CTRL CENTER v1.2</span>}
            </div>
          </aside>

          <main className="flex-1 p-6 overflow-y-auto max-w-full">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'olts' && renderOlts()}
            {activeTab === 'onus' && renderOnus()}
            {activeTab === 'routers' && renderRouters()}
            {activeTab === 'alarms' && renderAlarms()}
            {activeTab === 'config' && renderConfig()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'settings' && renderSettings()}
          </main>
        </div>
      </div>

      {/* Scrolling Alarm Ticker Footer */}
      <footer className="bg-black/90 border-t border-olt-border h-6 flex items-center overflow-hidden select-none z-30 font-mono text-2xs sticky bottom-0 text-olt-text">
        <div className="px-3 bg-olt-red text-black font-bold h-full flex items-center uppercase text-3xs border-r border-olt-border tracking-wider shadow-md shrink-0">
          <AlertTriangle size={10} className="mr-1 inline animate-bounce" /> Live Alerts
        </div>
        <div className="relative w-full overflow-hidden flex items-center h-full">
          <div className="absolute ticker-scroll flex items-center gap-10 whitespace-nowrap py-1">
            {[...alarmList.filter(a => a.status === 'active'), ...alarmList.filter(a => a.status === 'active')].map((alarm, idx) => {
              const color = SEVERITY_COLORS[alarm.severity] || COLORS.gray;
              return (
                <div key={idx} className="flex items-center gap-2 cursor-pointer hover:underline hover:text-white" onClick={() => { setAlarmFilter({ severity: '', status: 'active' }); setActiveTab('alarms'); }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                  <span className="font-bold text-olt-muted">[{formatDate(alarm.time).split(',')[1]?.trim()}]</span>
                  <span className="font-semibold text-olt-text">{alarm.oltName}</span>
                  <span className="text-olt-muted font-mono bg-olt-surface/40 px-1 border border-olt-border/30 rounded text-[9px]">{alarm.alarmType}</span>
                  <span className="text-olt-text truncate max-w-[200px]">{alarm.description}</span>
                </div>
              );
            })}
            {alarmList.filter(a => a.status === 'active').length === 0 && (
              <span className="text-olt-green font-bold tracking-widest uppercase">All Infrastructure Operations Nominal // Zero Active Fault Logs</span>
            )}
          </div>
        </div>
      </footer>

      {/* Floating overlay toasts alerts manager */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => {
          const typeColors = {
            success: 'border-olt-green bg-olt-panel/95 text-olt-text',
            danger: 'border-olt-red bg-olt-panel/95 text-olt-red',
            warning: 'border-olt-amber bg-olt-panel/95 text-olt-amber',
            info: 'border-olt-blue bg-olt-panel/95 text-olt-blue'
          };
          return (
            <div key={toast.id} className={`flex items-center gap-3.5 px-4.5 py-3 border-l-4 rounded-lg shadow-2xl font-sans text-xs font-semibold ${typeColors[toast.type] || typeColors.success} animate-slide-in max-w-sm`}>
              {toast.type === 'success' ? <CheckCircle size={16} className="text-olt-green" /> : toast.type === 'info' ? <Info size={16} className="text-olt-blue" /> : <AlertTriangle size={16} />}
              <span className="flex-1 leading-normal text-olt-text">{toast.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-olt-muted hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Latency Ping Modal */}
      <Modal isOpen={routerPingModalOpen} onClose={() => !routerPingActive && setRouterPingModalOpen(false)} title="ICMP Latency Trace Diagnostic" size="md">
        <div className="space-y-4">
          <div className="bg-black rounded-lg p-3 border border-olt-border font-mono text-2xs min-h-[160px] overflow-y-auto text-olt-green space-y-1">
            {routerPingResults.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {routerPingActive && (
              <div className="flex items-center gap-1.5 text-olt-muted font-bold animate-pulse mt-1">
                <RefreshCw size={10} className="animate-spin text-olt-blue" /> ICMP polling core...
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2 border-t border-olt-border/30">
            <Button disabled={routerPingActive} onClick={() => setRouterPingModalOpen(false)} variant="secondary">Close Output</Button>
          </div>
        </div>
      </Modal>

      {/* SSH CLI Terminal emulator modal */}
      {selectedRouter && (
        <Modal isOpen={routerConsoleModalOpen} onClose={() => setRouterConsoleModalOpen(false)} title={`SSH Console Shell: admin@${selectedRouter.name} (${selectedRouter.ip})`} size="lg">
          <div className="space-y-4">
            <div className="bg-black rounded-xl p-4 border border-olt-border font-mono text-xs h-[45vh] overflow-y-auto text-olt-green space-y-1 flex flex-col justify-between">
              <div>
                {routerConsoleLogs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">{line}</div>
                ))}
                <div ref={routerConsoleBottomRef} />
              </div>
            </div>

            {/* Input CLI line */}
            <form onSubmit={(e) => { e.preventDefault(); handleRouterConsoleSubmit(selectedRouter, routerConsoleInput); }} className="flex gap-2">
              <span className="font-mono text-xs text-olt-muted flex items-center shrink-0">
                {selectedRouter.vendor === 'MikroTik' 
                  ? `[admin@${selectedRouter.name}] >` 
                  : `${selectedRouter.name}${selectedRouter.vendor === 'Juniper' ? '>' : '#'}`}
              </span>
              <input
                type="text"
                value={routerConsoleInput}
                onChange={e => setRouterConsoleInput(e.target.value)}
                className="flex-1 bg-black/40 border border-olt-border rounded-lg px-3 py-1.5 text-xs text-olt-text focus:outline-none focus:ring-1 focus:ring-olt-blue font-mono"
                placeholder="Type command (e.g. 'help', 'show route', 'ping 1.1.1.1', 'exit')..."
                autoFocus
              />
              <Button type="submit" size="sm" variant="primary">Send</Button>
            </form>
          </div>
        </Modal>
      )}

      {/* SNMP Polling Status Bar Modal */}
      <Modal isOpen={snmpPollModalOpen} onClose={() => !snmpPollApplying && setSnmpPollModalOpen(false)} title={snmpPollTitle} size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-olt-muted font-semibold">SNMP Polling Progress:</span>
            <span className="text-xs font-mono font-bold text-olt-blue">{snmpPollProgress}%</span>
          </div>
          <div className="h-2 bg-olt-surface rounded-full overflow-hidden border border-olt-border">
            <div className="h-full bg-gradient-to-r from-olt-blue to-olt-green transition-all duration-300" style={{ width: `${snmpPollProgress}%` }} />
          </div>

          <div className="bg-black rounded-lg p-3 border border-olt-border font-mono text-2xs min-h-[160px] max-h-[250px] overflow-y-auto text-olt-green space-y-1">
            {snmpPollLogs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap">{log}</div>
            ))}
            {snmpPollApplying && (
              <div className="flex items-center gap-1.5 text-olt-muted font-bold animate-pulse mt-1">
                <RefreshCw size={10} className="animate-spin text-olt-blue" /> SNMP Polling MIB tables...
              </div>
            )}
            <div ref={snmpConsoleBottomRef} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button disabled={snmpPollApplying} onClick={() => setSnmpPollModalOpen(false)} variant="secondary">Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
