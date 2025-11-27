# Screen Monitoring System - Product Requirements Document (PRD)

## Overview

A dual-mode screen monitoring system for educational institutions
enabling lecturers to monitor student screens either through
internet-based remote mode or local network LAN-only mode. Built fully
using **Next.js 16**, **MongoDB (Mongoose)**, **WebRTC**, **Socket.IO**,
**shadcnUI**, **Zod validation**, and modern UI/UX principles.

------------------------------------------------------------------------

## Core Goals

-   Allow lecturers to monitor multiple student laptop screens in
    real-time.
-   Support **two connection modes**:
    1.  **Internet Mode** -- remote monitoring for home assignments.
    2.  **Offline LAN Mode** -- monitoring over same WiFi without using
        internet data.
-   Provide both **tile view** (many screens) and **full-screen view**
    (one student's screen).
-   Strong authentication with admin approval for lecturers.

------------------------------------------------------------------------

## System Roles

### **1. Admin**

-   Approve lecturer accounts.
-   Manage all users.
-   View system logs.
-   Seeder creates an initial admin.

### **2. Lecturer**

-   Can register but cannot access system until approved by admin.
-   Only role allowed to:
    -   Create monitoring sessions.
    -   Generate student join links.
    -   Set monitoring mode (full-screen forced or partial/zoom-style).
-   View live student screens.

### **3. Student**

-   Joins via provided link.
-   Shares screen (full screen or partial based on session mode).
-   Must explicitly grant browser permission.

------------------------------------------------------------------------

## Features

### ✔ Lecturer Features

1.  **Create Monitoring Link**
    -   Choose mode:
        -   **Full-Screen Forced**\
            Students share entire screen without UI choices.
        -   **Partial/Zoom-style**\
            Students can choose which screen/window to share.
    -   Choose session mode:
        -   **Internet Mode** (STUN + TURN servers)
        -   **LAN Mode** (No STUN/TURN or local STUN)
    -   Store session in database.
2.  **Monitoring Panel**
    -   Grid layout using shadcnUI + Tailwind CSS.
    -   Each tile shows a student screen stream.
    -   Dynamic grid (auto-resizes based on number of users).
    -   Clicking a tile → **full-screen view**.
3.  **Notifications**
    -   Student joined.
    -   Student left.
    -   Screen sharing started/stopped.

------------------------------------------------------------------------

### ✔ Student Features

1.  Open join link.
2.  Enter name & validate using Zod.
3.  Share screen (mode controlled by lecturer).
4.  Live preview before sharing.

------------------------------------------------------------------------

## UI/UX Requirements

### shadcnUI Components to Use

-   Button
-   Card
-   Input
-   Form
-   Toast
-   Tabs
-   Dropdown Menu
-   Avatar
-   Dialog (modal)
-   Skeleton loaders

### Zod Validation

-   Applies to:
    -   Login
    -   Registration
    -   Create monitoring link form
    -   Student join form
-   Errors must show:
    -   Below each field (red color)
    -   Global/common errors → **toast top-right**

### Icons

Use **Lucide Icons**: - Eye / EyeOff - Monitor - Laptop - Users -
PlusCircle - Settings - ShieldCheck (admin) - CheckCircle / XCircle

### Colors

-   Primary: Blue-600
-   Success: Green-600
-   Danger: Red-600
-   Warning: Yellow-600
-   For dark mode: Use Tailwind dark classes.

------------------------------------------------------------------------

## Technical Architecture

### **Next.js 16**

-   App Router
-   Server actions
-   API routes for:
    -   Auth
    -   Session creation
    -   Approvals
    -   Socket signaling

### **MongoDB + Mongoose**

Schemas: - User - name, email, password, role, isApproved - Session -
lecturerId, modeType, shareType, createdAt - StudentSession - sessionId,
studentName, socketId, connectedAt

Admin Seeder: - `/scripts/seed-admin.js`

### **WebRTC**

#### Internet Mode:

    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "turn:yourserver.com:3478", username: "...", credential: "..." }
    ]

#### LAN Mode:

    iceServers: []

### **Socket.IO**

Used for: - Signaling - Student connect/disconnect - Screen share
metadata - Session monitoring updates

------------------------------------------------------------------------

## Monitoring Experience

### Grid View

-   Display all student screens.

-   Responsive grid:

        1–4 users → 2x2
        5–9 users → 3x3
        10–16 → 4x4
        auto-expand...

### Full Screen View

-   Click → maximize selected student.
-   Single WebRTC stream in HD (if network allows).

------------------------------------------------------------------------

## Student Screen Modes

### 1. **Full-Screen Forced Mode**

-   Student cannot choose which window to share.
-   Browser auto-opens full-screen share dialog (still requires
    permission).
-   Use `displaySurface: "monitor"`.

### 2. **Partial (Zoom-style) Mode**

-   Student chooses:
    -   Whole screen
    -   Window
    -   Tab

------------------------------------------------------------------------

## Authentication Flow

### Admin Seeder Creates First Admin

    email: admin@example.com
    password: Admin@123
    role: admin
    isApproved: true

### Lecturer Registration

1.  Lecturer registers.

2.  Saved as:

        role: "lecturer"
        isApproved: false

3.  Admin receives approval notification.

4.  Admin approves lecturer.

5.  Lecturer can now access dashboard.

------------------------------------------------------------------------

## System Workflow

### 1. Lecturer creates session

-   Pick:
    -   **Screen mode:** Full / Partial
    -   **Connection mode:** Internet / LAN
-   Generate link
-   Students join

### 2. Students join

-   Validate form with Zod
-   Show preview
-   Start sharing

### 3. Lecturer monitors

-   Grid view
-   Full-screen mode
-   Real-time updates

------------------------------------------------------------------------

## Security Requirements

-   HTTPS for Internet mode
-   Local-only HTTP allowed for LAN
-   JWT-based auth
-   Role-based access control (RBAC)
-   Students cannot access lecturer dashboard

------------------------------------------------------------------------

## Performance Notes

-   LAN mode = faster, low-latency
-   Internet mode depends on TURN bandwidth
-   Server should scale to 30--40 students per session

------------------------------------------------------------------------

## Future Enhancements (Optional)

-   Recording
-   Chat between lecturer and student
-   AI cheat detection
-   Dual-screen support for students

------------------------------------------------------------------------

# End of PRD
