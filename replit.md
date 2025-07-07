# Lejebolig Find - Danish Rental Property Platform

## Overview

Lejebolig Find is a Danish rental property platform that connects property owners with potential tenants. The application allows users to search for rental properties, view detailed property information, create listings, and communicate with property owners through an integrated messaging system.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for development and production builds
- **Form Management**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Serverless PostgreSQL
- **Session Management**: Express sessions stored in PostgreSQL
- **Authentication**: Session-based authentication with bcrypt for password hashing
- **Development**: Hot reload with Vite middleware integration

### Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Backend Express application
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── db.ts              # Database connection
├── shared/                 # Shared code between frontend and backend
│   └── schema.ts          # Database schema and validation
└── migrations/            # Database migrations
```

## Key Components

### Authentication System
- Session-based authentication using Express sessions
- Password hashing with bcrypt
- Persistent sessions stored in PostgreSQL
- Protected routes requiring authentication

### Property Management
- Property listing creation and management
- Advanced search functionality with filters
- Property details with image support
- Property availability tracking

### Messaging System
- Real-time messaging between property owners and potential tenants
- Message read/unread status tracking
- Property-specific conversations

### Database Schema
- **Users**: User accounts with email authentication
- **Properties**: Property listings with detailed information
- **Messages**: Communication between users
- **Sessions**: Session storage for authentication

## Data Flow

1. **User Registration/Login**: Users create accounts or authenticate through the session-based auth system
2. **Property Browsing**: Users search and filter properties using the search interface
3. **Property Details**: Detailed property information is fetched and displayed
4. **Messaging**: Users can send messages to property owners through the integrated messaging system
5. **Property Management**: Authenticated users can create and manage their property listings

## External Dependencies

### Frontend Dependencies
- React ecosystem (React, React DOM, React Router via Wouter)
- UI Framework (shadcn/ui with Radix UI primitives)
- Form handling (React Hook Form, Hookform Resolvers)
- State management (TanStack React Query)
- Styling (Tailwind CSS, class-variance-authority)
- Validation (Zod)

### Backend Dependencies
- Express.js web framework
- Database (Drizzle ORM, Neon Serverless PostgreSQL)
- Authentication (bcrypt, express-session, connect-pg-simple)
- Development tools (tsx, esbuild)

### Build Tools
- Vite for frontend bundling and development
- ESBuild for backend bundling
- TypeScript for type safety
- PostCSS for CSS processing

## Deployment Strategy

### Development
- Frontend: Vite dev server with hot reload
- Backend: tsx with auto-restart on file changes
- Database: Neon Serverless PostgreSQL

### Production
- Frontend: Static build served by Express
- Backend: Bundled with ESBuild and served via Node.js
- Database: Neon Serverless PostgreSQL with connection pooling
- Sessions: Persistent session storage in PostgreSQL

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Session secret via `SESSION_SECRET` environment variable
- Production/development mode detection via `NODE_ENV`

## Changelog
- July 06, 2025. Initial setup
- July 06, 2025. Fixed image upload system:
  - Replaced blob URLs with proper server-side image uploads
  - Images now uploaded to /api/upload endpoint during property creation
  - Fixed image display in property cards and detail views
- July 06, 2025. Fixed property editing access control:
  - Corrected type definitions for PropertyWithUser
  - Fixed ownership verification for property editing
- July 06, 2025. Database cleanup:
  - Removed test/mock data from database
  - Cleaned up properties with invalid blob URLs
- July 07, 2025. Migration to Replit environment:
  - Added automatic database schema deployment system
  - Created server/migrations.ts for Railway/production compatibility
  - Database tables now auto-create on application startup
  - Removed dependency on manual drizzle-kit commands for production
- July 07, 2025. Project migration to Replit environment:
  - Migrated from Replit Agent to standard Replit environment
  - Set up PostgreSQL database with proper environment variables
  - Installed missing tsx dependency
  - Created database schema using Drizzle migrations
  - Verified all API endpoints are working correctly
- July 07, 2025. Consolidated edit functionality and UI improvements:
  - Merged edit-listing.tsx into create-listing.tsx for unified property management
  - Fixed image upload race condition that prevented images from saving to database
  - Improved button colors from very dark to lighter shade for better theme fit
  - Added comprehensive debugging for image upload process
  - Enhanced form to handle both creating new properties and editing existing ones
  - Updated routing to use single component for both create and edit operations
- July 07, 2025. Design consistency improvements:
  - Made Create Listing page visually match Edit Listing page
  - Added organized sections with icons (Basic Information, Location, Pricing & Size, Images)
  - Improved layout with max-width 4xl and better spacing
  - Enhanced loading states with professional spinner design
  - Added structured form sections with clear visual hierarchy
  - Maintained distinct functionality while achieving visual consistency
- July 07, 2025. Messaging system improvements:
  - Fixed conversation grouping to prevent message threads from splitting
  - Added real-time message updates with automatic polling every 3 seconds
  - Implemented proper sender name display and improved message timestamps
  - Added auto-scroll to bottom when new messages arrive
  - Enhanced message UI to look like modern messenger (Facebook-style)
  - Fixed immediate message display after sending (no browser refresh needed)
- July 07, 2025. Fixed messaging system conversation grouping:
  - Fixed issue where replies created new chat threads instead of continuing existing conversations
  - Improved conversation grouping logic to use consistent keys regardless of sender/receiver roles
  - Enhanced message display with sender names and proper Facebook Messenger-style layout
  - Added visual indicators for message senders and improved timestamp formatting
  - Messages now properly thread in single conversations between users for each property
- July 07, 2025. Fixed messaging system conversation grouping:
  - Fixed issue where replies created new chat threads instead of continuing existing conversations
  - Improved conversation grouping logic to use consistent keys regardless of sender/receiver roles
  - Enhanced message display with sender names and proper Facebook Messenger-style layout
  - Added visual indicators for message senders and improved timestamp formatting
  - Messages now properly thread in single conversations between users for each property
- July 07, 2025. Migration to standard Replit environment completed:
  - Successfully migrated from Replit Agent to standard Replit environment
  - Set up PostgreSQL database with proper environment variables
  - Fixed messaging system real-time updates with improved cache invalidation
  - Enhanced message styling with color-coded sender/receiver bubbles (blue for sender, gray for receiver)
  - Improved message auto-refresh to 2-second intervals for immediate message display
  - Fixed property ownership caching issues with user-specific query keys
  - Project now runs cleanly in standard Replit environment with proper security practices

## User Preferences

Preferred communication style: Simple, everyday language.