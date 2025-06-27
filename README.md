# NestJS Xendit Payment Gateway Integration

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A simple payment gateway integration using NestJS and Xendit that allows users to purchase subscription packages and access paid features.</p>

## 🚀 Deployment URL

**Live Demo:** `https://nest-xendit-be-production.up.railway.app/`

## 📋 Features

### Payment Methods Supported

- **Virtual Account** (BCA, BNI, BRI, Mandiri, Permata, BSI, CIMB)
- **Debit/Credit Card**
- **QR Code (QRIS)**

### Core Functionality

- **User Authentication** with JWT
- **Multiple Payment Methods** via Xendit
- **Protected Content Access** for paid users
- **Payment History & Status Tracking**
- **Real-time Payment Processing** with webhooks

## Tech Stack

- **Backend:** NestJS (Node.js/TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **Payment Gateway:** Xendit via **xendit-node SDK**
- **Authentication:** JWT with Passport
- **Validation:** Class Validator & Class Transformer

## Payment Integration Overview

### Using Official Xendit-node SDK

This application integrates with Xendit using their **official Node.js SDK** for reliable and secure payment processing.

### Payment Flow

1. **User Registration/Login**
   - Users create account or login to access subscription features

2. **Package Selection**
   - Choose from available packages
   - Each package provides different levels of access duration

3. **Payment Creation**
   - System creates invoice using **xendit-node SDK**
   - Generates secure payment URL for user

4. **Payment Processing**
   - User redirected to Xendit's secure payment page
   - Multiple payment options available (Bank Transfer, Card, QRIS)
   - Xendit handles all payment security and processing

5. **Real-time Updates**
   - Xendit sends webhook notifications when payment status changes
   - System automatically activates subscription upon successful payment
   - User immediately gains access to paid content

6. **Content Access**
   - Authenticated users with active subscriptions can access protected content
   - Payment history available in user profile page

## 📚 API Documentation

Key endpoints:

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - User information
- `GET /subscription/plans` - Get available packages
- `GET /class` - Get all available classes
- `GET /class/:classId` - Get class details including free contents
- `GET /payments/package` - Get all available subscription packages
- `GET /payments/history` - Get all payment history, including PENDING and EXPIRED payments
- `POST /payments/subcribe` - Make an order of subscription. Request body:

```
"packageId": string,
"paymentMethod": string,
```

## 🚀 Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Xendit account with API key

### Quick Start

1. **Clone Repository**

   ```
   git clone https://github.com/matthewhjt/nest-xendit
   cd nest-xendit
   ```

2. **Install dependencies**

   `npm install`

3. **Environment Configuration**

   Copy `.env.example`

4. **Database Setup**

   ```
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Application**

   ```
   npm run start:dev
   ```
