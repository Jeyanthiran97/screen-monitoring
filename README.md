# Screen Monitoring System

A dual-mode screen monitoring system for educational institutions enabling lecturers to monitor student screens either through internet-based remote mode or local network LAN-only mode.

## Features

- **Dual Connection Modes**
  - Internet Mode: Remote monitoring with STUN/TURN servers
  - LAN Mode: Local network only, no internet required

- **Screen Sharing Modes**
  - Full-Screen Forced: Students share entire screen automatically
  - Partial (Zoom-style): Students choose screen/window/tab

- **Role-Based Access**
  - Admin: Approve lecturer accounts, manage users
  - Lecturer: Create sessions, monitor student screens
  - Student: Join sessions and share screens

- **Real-Time Monitoring**
  - Grid view for multiple students
  - Full-screen view for individual students
  - Real-time notifications for join/leave events

## Tech Stack

- **Next.js 16** with App Router
- **MongoDB** with Mongoose
- **WebRTC** for peer-to-peer screen sharing
- **Socket.IO** for real-time signaling
- **shadcnUI** components
- **Zod** for validation
- **JWT** for authentication

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd screen-monitoring
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/screen-monitoring
JWT_SECRET=your-secret-key-change-this-in-production
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Seed the admin user:
```bash
npm run seed
```

This creates an admin user with:
- Email: `admin@example.com`
- Password: `Admin@123`

## Running the Application

1. Start MongoDB (if running locally):
```bash
mongod
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Admin Login
1. Login with admin credentials
2. Navigate to Admin Dashboard
3. Approve pending lecturer registrations

### Lecturer Registration
1. Register as a lecturer
2. Wait for admin approval
3. Login and create monitoring sessions
4. Choose connection mode (Internet/LAN) and screen sharing mode (Full-Screen/Partial)
5. Share the join link with students
6. Open the monitoring panel to view student screens

### Student Join
1. Open the join link provided by lecturer
2. Start screen preview
3. Enter your name
4. Join the session
5. Screen sharing will start automatically

## Project Structure

```
screen-monitoring/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication pages
│   │   ├── admin/            # Admin dashboard
│   │   ├── lecturer/        # Lecturer dashboard and monitoring
│   │   ├── join/             # Student join pages
│   │   └── api/              # API routes
│   ├── components/
│   │   └── ui/               # shadcnUI components
│   ├── lib/                  # Utilities and helpers
│   └── models/               # Mongoose models
├── scripts/
│   └── seed-admin.js         # Admin seeder script
└── server.ts                 # Custom server with Socket.IO
```

## API Routes

- `POST /api/auth/register` - Register new lecturer
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `GET /api/admin/lecturers` - Get all lecturers (admin only)
- `POST /api/admin/lecturers/[id]/approve` - Approve lecturer (admin only)
- `POST /api/sessions/create` - Create monitoring session (lecturer only)
- `GET /api/sessions` - Get lecturer's sessions
- `GET /api/sessions/[sessionCode]` - Get session details
- `GET /api/sessions/[sessionCode]/students` - Get connected students

## Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NEXT_PUBLIC_SOCKET_URL` - Socket.IO server URL
- `NEXT_PUBLIC_APP_URL` - Application URL

## Development

The application uses a custom server (`server.ts`) to integrate Socket.IO with Next.js. The server handles both HTTP requests and WebSocket connections.

## Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production for Internet mode
- HTTP is acceptable for LAN mode in local networks
- Implement rate limiting for production
- Add TURN server credentials for production Internet mode

## Future Enhancements

- Recording functionality
- Chat between lecturer and student
- AI cheat detection
- Dual-screen support for students

## License

MIT
