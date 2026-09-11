# Business Requirements Document (BRD)
## New Time and Attendance Tracking Application & System

---

## 1. Executive Summary & Project Overview
The objective of this Business Requirements Document (BRD) is to specify the business, functional, and technical requirements for developing a new Time and Attendance Tracking System and Mobile Application. Modeled after the operational workflows and features of the pPonto platform, this system provides a comprehensive workforce management solution. Key priorities include fraud prevention (anti-tampering), HR process automation, strict labor law compliance, and an intuitive user experience across both Web and Mobile platforms.

---

## 2. Business Objectives
* **Ensure Punch Integrity:** Eliminate fraudulent time-tracking practices (e.g., "buddy punching") through biometric verification and geolocation tracking.
* **Increase HR Operational Efficiency:** Automate the calculation of overtime, compensatory time (hour banks), leave requests, and seamless data transfer to payroll software.
* **Maintain Regulatory & Fiscal Compliance:** Fully comply with Ministry of Labor regulations by generating mandatory fiscal audit files automatically.
* **Provide High Availability & Operational Flexibility:** Enable continuous clock-in capabilities regardless of connectivity (offline mode) while supporting on-site, hybrid, and remote/work-from-home (WFH) work models.

---

## 3. System Scope & Core Functionalities

### 3.1. Core Capabilities

#### A. Security & Authentication
* **Photo-Proof Clock-In (Anti-Fraud):**
  * *Description:* Mandatory camera capture during every punch to prevent proxy attendance.
  * *Technical Requirement:* Integrated hardware camera access (webcam or mobile device) with browser/app permission grants.
* **Facial Recognition:**
  * *Description:* Identity verification by matching real-time photo capture against stored user face templates.
  * *Technical Requirement:* Pre-enrolled user biometric profiles; facial processing algorithm enabled for advanced subscription tiers.
* **Geolocation Tracking:**
  * *Description:* Captures precise GPS coordinates at the exact timestamp of the clock-in event.
  * *Technical Requirement:* Enabled device GPS and explicit location permissions granted to the web portal or mobile app.

#### B. Time Management & System Administration
* **Manual Hour Adjustment / Compensation:**
  * *Description:* Enables HR personnel to manually review, adjust, approve, or reject accrued debit/credit hours.
  * *Technical Requirement:* Feature flag toggle within the system's "General Settings".
* **Automated Punch Reminders:**
  * *Description:* Automated notifications sent to employees reminding them to log shift start/end and meal breaks.
  * *Technical Requirement:* Configurable alert lead-time based on individual work schedule assignments.
* **Role-Based Access Control (RBAC):**
  * *Description:* Granular permission hierarchy defining system access levels based on user roles (Admin, Manager, Employee).
  * *Technical Requirement:* Unique Taxpayer ID (CPF) identifier linked to specific access control profiles.
* **Geofencing:**
  * *Description:* Virtual perimeter boundaries. Punches executed outside designated geographic radii trigger manager alerts or are blocked entirely.
  * *Technical Requirement:* Administrative setup of target street addresses/coordinates and customizable tolerance radii (e.g., 70 meters).

#### C. Compliance & Hardware Integration
* **Fiscal File Generation:**
  * *Description:* Automated export of mandatory labor inspection files (e.g., AFD, ACJEF) required by regulatory bodies.
  * *Technical Requirement:* Accurate configuration of corporate registration details, tax IDs, and employee registration numbers.
* **Payroll System Integration:**
  * *Description:* Direct data synchronization with external accounting and payroll processing software.
  * *Technical Requirement:* Customizable export file layouts, event ID mapping, and time format conversion (centesimal vs. sexagesimal).
* **Physical Time Clock (REP) Synchronization:**
  * *Description:* Ingestion and consolidation of time punches originating from physical hardware clocks on-premise.
  * *Technical Requirement:* IP address, network port, and manufacturer serial number setup (technical support assisted).

---

### 3.2. Advanced Features

* **Advanced User Hierarchy Management:**
  * *Objective:* Secure access control ensuring users only view and edit data relevant to their organizational unit.
  * *Workflow:* Administrators configure user credentials (email/password), assign granular permission levels (e.g., shift scheduling, punch adjustments), and scope management authority over designated employee groups.
* **Automated Payroll Integration:**
  * *Objective:* Eliminate manual data entry during monthly payroll closing cycles.
  * *Workflow:* Configuration of custom export layouts, pay codes, time formatting rules, and third-party software IDs.
* **Custom Analytical Reporting:**
  * *Objective:* Provide actionable workforce intelligence regarding attendance, overtime, absenteeism, and hour banks.
  * *Workflow:* Flexible filtering by date range, department, or individual. On-screen visualization with instant export to PDF and Excel formats.
* **In-App Leave Request Management:**
  * *Objective:* Centralize and streamline medical certificates, PTO, and absence requests.
  * *Workflow:* Employees submit absence requests via the mobile app. Managers receive visual alerts on the time treatment dashboard to approve or reject requests directly.

---

## 4. Detailed User Journeys

### 4.1. Web-Based Clock-In Journey (Ponto Web)

```
[Start]
   │
   ▼
1. User accesses Ponto Web URL & verifies browser permissions (Camera + Location enabled)
   │
   ▼
2. User authenticates via Login Credentials
   │
   ▼
3. User clicks "Access My Punch" ("Acessar meu ponto")
   │
   ├──► System activates camera for photo verification
   └──► System pulls current location (User can click "Update Location" if necessary)
   │
   ▼
4. Optional Adjustments
   └──► Request Punch Correction (specify date, time, and reason for missing entry)
   │
   ▼
5. User clicks "Register Punch" ("Registrar batida")
   │
   ▼
[Completion] Confirmation modal displayed + Digital receipt sent via Email
```

---

### 4.2. Mobile App Clock-In Journey

```
[Start]
   │
   ▼
1. Launch App & grant permissions (Camera, GPS Location, Microphone, Notifications)
   │
   ▼
2. Authenticate (Username & Password)
   │
   ▼
3. Core Clock-In Flow
   ├──► Facial Recognition scanning and verification
   ├──► Background GPS Coordinate Capture
   └──► Geofence Perimeter Check (If outside authorized zone: trigger alert or block)
   │
   ▼
4. Connectivity Handling (Offline Mode)
   └──► IF No Network Connection: Punch saved locally in device cache (Orange Warning Screen)
        and automatically synchronized upon network restoration.
   │
   ▼
5. In-App Additional Actions
   └──► Submit Punch Adjustment Requests with justification for Manager approval.
   │
   ▼
[Completion] Success confirmation (Time & Date displayed) + Automated Email Receipt
```

---

## 5. Business & Technical Requirements Traceability Matrix

| Module / Feature | Business Requirement | Technical Requirement / Prerequisite |
| :--- | :--- | :--- |
| **Anti-Fraud Security** | Photo capture & facial biometric verification | Functional hardware camera; OS/Browser permissions; facial recognition matching engine. |
| **Geofencing & Location** | Restrict/monitor authorized clock-in zones | Active GPS; address/coordinates setup with customizable tolerance radius (e.g., 70m). |
| **Access Control** | Role-based data visibility & editing rights | Unique Tax ID (CPF); access level parameters mapped to user profile accounts. |
| **Legal Compliance** | Mandatory labor compliance audit exports | Validated corporate and employee metadata for generating AFD/ACJEF standard files. |
| **Payroll Automation** | Direct data export to accounting tools | Configurable export layouts; pay codes; sexagesimal/centesimal time conversion logic. |
| **REP Hardware Sync** | Consolidate physical clock-in hardware data | Network IP configuration, port binding, and device serial number registration. |
| **Offline Capability** | Uninterrupted clock-in in zero-connectivity areas | Local client storage (SQLite/Realm); background sync queue upon network recovery. |
| **Analytics & Reporting** | Real-time monitoring of overtime, bank hours, & absences | Customizable query engine with PDF and Excel export data formatters. |
