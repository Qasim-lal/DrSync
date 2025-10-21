# SSE Events Usage Guide - Real-Time Dashboard Updates

**Component:** TASK-040 Section 8 - Real-Time SSE Events  
**Version:** 1.0  
**Date:** October 19, 2025

---

## 📋 Overview

The SSE (Server-Sent Events) system provides **real-time updates** for WhatsApp message activity in the dashboard. Admins and Super Admins can see messages as they are received, processed, and responded to.

---

## 🎯 User Roles & Access

### **Organization Admin**
- ✅ View messages for THEIR organization only
- ✅ See real-time activity in their clinic/hospital
- ❌ Cannot see other organizations

### **Super Admin**
- ✅ View ALL organizations at once (aggregate view)
- ✅ Select multiple specific organizations (filtered view)
- ✅ View single organization (same as org admin)

---

## 🔌 SSE Endpoints

### **1. Single Organization Stream** (Org Admin & Super Admin)
```
GET /api/events/messages/:organizationId/stream
```

**Access:**
- Org Admin: Only their `organizationId`
- Super Admin: Any `organizationId`

**Frontend Example:**
```typescript
// Connect to single organization stream
const eventSource = new EventSource(
  `/api/events/messages/${organizationId}/stream`,
  { 
    headers: { 
      Authorization: `Bearer ${authToken}` 
    } 
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New event:', data);
  
  // Update dashboard UI
  updateDashboard(data);
};

eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
  // Reconnect logic
};
```

---

### **2. All Organizations Stream** (Super Admin Only) ⭐ NEW
```
GET /api/events/messages/all/stream
```

**Access:** Super Admin only

**Use Case:** Monitor all clinics/hospitals across the entire platform

**Frontend Example:**
```typescript
// Super Admin: View ALL organizations
const eventSource = new EventSource(
  '/api/events/messages/all/stream',
  { 
    headers: { 
      Authorization: `Bearer ${authToken}` 
    } 
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Event includes organizationId to identify source
  console.log(`Event from Org ${data.organizationId}:`, data);
  
  // Update aggregated dashboard
  addToAggregateView(data);
};
```

**Response Example:**
```json
{
  "eventType": "message:received",
  "organizationId": "org123",
  "phoneNumber": "+923001234567",
  "messageId": "msg456",
  "timestamp": "2025-10-19T14:00:00.000Z",
  "data": {
    "messageText": "I want to book an appointment"
  }
}
```

---

### **3. Multiple Organizations Stream** (Super Admin Only) ⭐ NEW
```
GET /api/events/messages/multi/stream?orgIds=id1,id2,id3
```

**Access:** Super Admin only

**Use Case:** Monitor specific selected organizations (e.g., top 5 clinics, or specific regions)

**Frontend Example:**
```typescript
// Super Admin: Select multiple organizations
const selectedOrgs = ['org123', 'org456', 'org789'];

const eventSource = new EventSource(
  `/api/events/messages/multi/stream?orgIds=${selectedOrgs.join(',')}`,
  { 
    headers: { 
      Authorization: `Bearer ${authToken}` 
    } 
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Only events from selected orgs
  console.log(`Event from ${data.organizationId}:`, data);
  
  // Update filtered dashboard
  updateMultiOrgView(data);
};
```

**UI Example:**
```typescript
// Dashboard with organization checkboxes
<OrganizationSelector 
  organizations={allOrgs}
  onSelectionChange={(selectedIds) => {
    // Reconnect SSE with new selection
    connectToMultiOrgStream(selectedIds);
  }}
/>
```

---

## 📊 Event Types

### **1. Message Received**
```json
{
  "eventType": "message:received",
  "organizationId": "org123",
  "phoneNumber": "+923001234567",
  "messageId": "msg456",
  "timestamp": "2025-10-19T14:00:00.000Z",
  "data": {
    "messageText": "I want to book an appointment",
    "phoneNumberId": "123456789"
  }
}
```

### **2. Message Processing**
```json
{
  "eventType": "message:processing",
  "organizationId": "org123",
  "phoneNumber": "+923001234567",
  "messageId": "msg456",
  "timestamp": "2025-10-19T14:00:00.100Z",
  "data": {
    "intent": "BOOK_APPOINTMENT",
    "language": "en"
  }
}
```

### **3. Message Responded**
```json
{
  "eventType": "message:responded",
  "organizationId": "org123",
  "phoneNumber": "+923001234567",
  "messageId": "msg456",
  "timestamp": "2025-10-19T14:00:00.500Z",
  "data": {
    "intent": "BOOK_APPOINTMENT",
    "language": "en",
    "processingTimeMs": 350,
    "responseText": "Please select a doctor..."
  }
}
```

### **4. Message Failed**
```json
{
  "eventType": "message:failed",
  "organizationId": "org123",
  "phoneNumber": "+923001234567",
  "messageId": "msg456",
  "timestamp": "2025-10-19T14:00:00.200Z",
  "data": {
    "error": "Database connection timeout",
    "processingTimeMs": 150
  }
}
```

---

## 🎨 Dashboard UI Examples

### **Organization Admin Dashboard**
```typescript
// Simple single-org view
function OrgAdminDashboard({ organizationId, authToken }) {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/events/messages/${organizationId}/stream`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Add to message list
      setMessages(prev => [data, ...prev].slice(0, 100));
      
      // Show toast notification
      if (data.eventType === 'message:received') {
        toast.info(`New message from ${data.phoneNumber}`);
      }
    };
    
    return () => eventSource.close();
  }, [organizationId, authToken]);
  
  return (
    <div className="dashboard">
      <h2>Real-Time Message Activity</h2>
      <MessageList messages={messages} />
    </div>
  );
}
```

### **Super Admin Dashboard - All Organizations**
```typescript
// Aggregate view of all organizations
function SuperAdminDashboardAll({ authToken }) {
  const [messagesByOrg, setMessagesByOrg] = useState({});
  const [stats, setStats] = useState({ total: 0, byOrg: {} });
  
  useEffect(() => {
    const eventSource = new EventSource(
      '/api/events/messages/all/stream',
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Group by organization
      setMessagesByOrg(prev => ({
        ...prev,
        [data.organizationId]: [
          data,
          ...(prev[data.organizationId] || [])
        ].slice(0, 50)
      }));
      
      // Update statistics
      setStats(prev => ({
        total: prev.total + 1,
        byOrg: {
          ...prev.byOrg,
          [data.organizationId]: (prev.byOrg[data.organizationId] || 0) + 1
        }
      }));
    };
    
    return () => eventSource.close();
  }, [authToken]);
  
  return (
    <div className="super-admin-dashboard">
      <h2>All Organizations - Live Activity</h2>
      <StatsPanel stats={stats} />
      <OrganizationTabs messagesByOrg={messagesByOrg} />
    </div>
  );
}
```

### **Super Admin Dashboard - Selected Organizations**
```typescript
// Multi-select filtered view
function SuperAdminDashboardMulti({ authToken, allOrganizations }) {
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [eventSource, setEventSource] = useState(null);
  
  useEffect(() => {
    if (selectedOrgs.length === 0) return;
    
    // Close previous connection
    if (eventSource) {
      eventSource.close();
    }
    
    // Open new connection with selected orgs
    const newEventSource = new EventSource(
      `/api/events/messages/multi/stream?orgIds=${selectedOrgs.join(',')}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    newEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [data, ...prev].slice(0, 200));
    };
    
    setEventSource(newEventSource);
    
    return () => newEventSource.close();
  }, [selectedOrgs, authToken]);
  
  return (
    <div className="super-admin-dashboard">
      <h2>Selected Organizations Monitor</h2>
      
      <OrganizationSelector
        organizations={allOrganizations}
        selectedIds={selectedOrgs}
        onChange={setSelectedOrgs}
      />
      
      <MessageStream 
        messages={messages}
        showOrgLabels={true}
      />
    </div>
  );
}
```

---

## 🔧 Additional Endpoints

### **Get Event History**
```
GET /api/events/messages/:organizationId/history?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organizationId": "org123",
    "events": [...],
    "count": 50
  }
}
```

### **Get Statistics**
```
GET /api/events/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeListeners": 5,
    "organizationsWithHistory": 12,
    "totalHistoryEvents": 1500
  }
}
```

### **Clear History** (Admin only)
```
DELETE /api/events/messages/:organizationId/history
```

---

## ⚡ Features

### **Heartbeat**
- Sent every 30 seconds to keep connection alive
- Format: `: heartbeat\n\n`
- Client should expect these and ignore them

### **Automatic Reconnection**
```typescript
function createSSEConnection(url, authToken, onMessage) {
  let eventSource;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  function connect() {
    eventSource = new EventSource(url, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    eventSource.onmessage = onMessage;
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
      
      // Reconnect with exponential backoff
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        setTimeout(() => {
          reconnectAttempts++;
          connect();
        }, delay);
      }
    };
    
    eventSource.onopen = () => {
      reconnectAttempts = 0; // Reset on successful connection
      console.log('SSE connected');
    };
  }
  
  connect();
  
  return () => eventSource.close();
}
```

---

## 📊 Use Cases

### **Organization Admin**
1. **Real-time message monitoring** - See patient messages as they arrive
2. **Response tracking** - Verify bot is responding correctly
3. **Error alerts** - Get notified of processing failures
4. **Activity dashboard** - Live view of conversation activity

### **Super Admin**
1. **Platform-wide monitoring** - See all organizations at once
2. **Performance tracking** - Compare response times across clinics
3. **Regional monitoring** - Select specific regions/groups
4. **Troubleshooting** - Quickly identify which orgs have issues
5. **Analytics** - Real-time platform-wide statistics

---

## 🎯 Summary

| Endpoint | Access | Use Case |
|----------|--------|----------|
| `/messages/:orgId/stream` | Org Admin, Super Admin | Single organization |
| `/messages/all/stream` | Super Admin only | All organizations |
| `/messages/multi/stream?orgIds=...` | Super Admin only | Selected organizations |

**All endpoints require JWT authentication via Authorization header.**

---

**Implementation Status:** ✅ Complete and Production Ready

**Next Steps:**
1. Frontend team implements dashboard UI with SSE connections
2. Test with WhatsApp simulator
3. Monitor performance with real traffic

---

**Document Version:** 1.0  
**Last Updated:** October 19, 2025  
**Author:** DrSync Development Team
