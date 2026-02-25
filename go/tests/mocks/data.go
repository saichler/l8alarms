package mocks

// Topology node data (synthetic since l8topology is a separate service)
var nodeIDs = []string{
	"node-core-rtr-01", "node-core-rtr-02", "node-dist-sw-01", "node-dist-sw-02",
	"node-acc-sw-01", "node-acc-sw-02", "node-acc-sw-03", "node-acc-sw-04",
	"node-fw-01", "node-fw-02", "node-lb-01", "node-lb-02",
	"node-srv-web-01", "node-srv-web-02", "node-srv-app-01", "node-srv-app-02",
	"node-srv-db-01", "node-srv-db-02", "node-ap-01", "node-ap-02",
}

var nodeNames = []string{
	"Core-Router-01", "Core-Router-02", "Dist-Switch-01", "Dist-Switch-02",
	"Access-Switch-01", "Access-Switch-02", "Access-Switch-03", "Access-Switch-04",
	"Firewall-01", "Firewall-02", "Load-Balancer-01", "Load-Balancer-02",
	"Web-Server-01", "Web-Server-02", "App-Server-01", "App-Server-02",
	"DB-Server-01", "DB-Server-02", "Access-Point-01", "Access-Point-02",
}

var nodeTypes = []string{
	"ROUTER", "ROUTER", "SWITCH", "SWITCH",
	"SWITCH", "SWITCH", "SWITCH", "SWITCH",
	"FIREWALL", "FIREWALL", "LOAD_BALANCER", "LOAD_BALANCER",
	"SERVER", "SERVER", "SERVER", "SERVER",
	"SERVER", "SERVER", "ACCESS_POINT", "ACCESS_POINT",
}

var locations = []string{
	"DC-East", "DC-East", "DC-East", "DC-East",
	"DC-East", "DC-West", "DC-West", "DC-West",
	"DC-East", "DC-West", "DC-East", "DC-West",
	"DC-East", "DC-West", "DC-East", "DC-West",
	"DC-East", "DC-West", "Office-HQ", "Office-HQ",
}

var linkIDs = []string{
	"link-core-01-dist-01", "link-core-01-dist-02",
	"link-core-02-dist-01", "link-core-02-dist-02",
	"link-dist-01-acc-01", "link-dist-01-acc-02",
	"link-dist-02-acc-03", "link-dist-02-acc-04",
	"link-fw-01-core-01", "link-fw-02-core-02",
}

// Alarm definition data
var alarmDefNames = []string{
	"Link Down", "High CPU Utilization", "High Memory Utilization",
	"Interface Errors", "BGP Peer Down", "OSPF Neighbor Lost",
	"Power Supply Failure", "Fan Failure", "Temperature High",
	"Disk Space Critical", "Authentication Failure", "Configuration Changed",
	"Port Security Violation", "DHCP Pool Exhausted", "DNS Resolution Failure",
	"SSL Certificate Expiring", "Backup Failure", "Reachability Lost",
	"High Packet Loss", "High Latency",
}

var alarmDefDescriptions = []string{
	"Network link has gone down", "CPU utilization exceeds threshold",
	"Memory utilization exceeds threshold", "Interface is reporting errors",
	"BGP peering session has been lost", "OSPF adjacency has been lost",
	"Power supply unit has failed", "Cooling fan has failed",
	"Device temperature exceeds safe threshold", "Disk space is critically low",
	"Multiple authentication failures detected", "Device configuration was changed",
	"Port security violation detected", "DHCP address pool is exhausted",
	"DNS resolution is failing", "SSL certificate is about to expire",
	"Scheduled backup has failed", "Device is unreachable",
	"Packet loss exceeds acceptable threshold", "Network latency exceeds threshold",
}

var eventPatterns = []string{
	"linkDown|ifOperStatus.*down", "cpuUtil.*threshold|highCPU",
	"memUtil.*threshold|highMemory", "ifInErrors|ifOutErrors|crcError",
	"bgpPeerDown|bgpBackwardTransition", "ospfNbrStateChange.*down",
	"powerSupply.*fail", "fan.*fail|coolingFail",
	"tempAboveThreshold|overheating", "diskSpace.*critical|lowDisk",
	"authFailure|loginFailed", "configChanged|sysConfigChange",
	"portSecurityViolation", "dhcpPoolExhausted",
	"dnsResolutionFail", "sslCertExpiring",
	"backupFailed", "reachabilityLost|pingTimeout",
	"packetLoss.*threshold", "latency.*threshold",
}

var clearPatterns = []string{
	"linkUp|ifOperStatus.*up", "cpuUtil.*normal",
	"memUtil.*normal", "ifErrors.*cleared",
	"bgpPeerUp|bgpEstablished", "ospfNbrStateChange.*full",
	"powerSupply.*ok", "fan.*ok",
	"tempNormal", "diskSpace.*normal",
	"", "configRestored",
	"", "dhcpPoolAvailable",
	"dnsResolutionOk", "sslCertRenewed",
	"backupSucceeded", "reachabilityRestored|pingOk",
	"packetLoss.*normal", "latency.*normal",
}

// Event messages
var eventMessages = []string{
	"Interface GigabitEthernet0/1 changed state to down",
	"CPU utilization at 95% for the last 5 minutes",
	"Memory utilization at 92% - swapping detected",
	"CRC errors detected on interface GigabitEthernet0/2: 1523 in last hour",
	"BGP peer 10.0.0.1 (AS 65001) session terminated",
	"OSPF neighbor 10.0.0.2 lost on interface GigabitEthernet0/0",
	"Power supply unit 2 has failed - running on single PSU",
	"Fan tray 3 has failed - reduced cooling capacity",
	"Temperature sensor reports 78C (threshold: 70C)",
	"Root filesystem at 96% - only 2GB remaining",
	"5 failed SSH login attempts from 192.168.1.100 in 60 seconds",
	"Running configuration modified by admin via SSH",
	"MAC address violation on port GigabitEthernet0/24",
	"DHCP pool VLAN100 has no available addresses",
	"DNS query timeout for api.example.com after 3 retries",
	"SSL certificate for *.example.com expires in 7 days",
	"Nightly backup job failed: connection timeout to backup server",
	"ICMP ping to 10.0.0.1 failed after 5 consecutive attempts",
	"Packet loss to 10.0.0.5 at 15% (threshold: 5%)",
	"Round-trip latency to 10.0.0.5 at 250ms (threshold: 100ms)",
}

// Correlation rule names
var corrRuleNames = []string{
	"Upstream Router Failure", "Switch Cascade Failure",
	"Server Farm Outage", "Power Domain Failure",
	"Link Flap Temporal", "Firewall Pair Correlation",
}

// Notification policy names
var notifPolicyNames = []string{
	"Critical Alert - NOC", "Major Alert - Engineering",
	"All Alerts - Dashboard", "Security Alerts - SecOps",
}

// Escalation policy names
var escPolicyNames = []string{
	"Critical Escalation Path", "Major Alarm Escalation",
}

// Maintenance window names
var maintWindowNames = []string{
	"Weekly Network Maintenance", "Monthly Patch Window",
	"DC-East UPS Maintenance", "Firewall Rule Update",
}

// Filter names
var filterNames = []string{
	"Critical Active Alarms", "All Active Alarms",
	"Root Cause Only", "DC-East Alarms",
	"Suppressed Alarms", "Server Alarms",
}
