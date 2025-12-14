-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('PHONE_VERIFICATION', 'EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GuestRideStatus" AS ENUM ('PENDING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WAVE', 'ORANGE_MONEY', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_RECEIVED', 'RIDE_REMINDER', 'NEW_MESSAGE', 'REVIEW_RECEIVED', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDriver" BOOLEAN NOT NULL DEFAULT false,
    "carModel" TEXT,
    "carPlate" TEXT,
    "carColor" TEXT,
    "driverLicense" TEXT,
    "refreshToken" TEXT,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "originAddress" TEXT,
    "originLat" DOUBLE PRECISION,
    "originLng" DOUBLE PRECISION,
    "destinationCity" TEXT NOT NULL,
    "destinationAddress" TEXT,
    "destinationLat" DOUBLE PRECISION,
    "destinationLng" DOUBLE PRECISION,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION,
    "pricePerSeat" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "totalSeats" INTEGER NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "features" TEXT[],
    "description" TEXT,
    "status" "RideStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestRide" (
    "id" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "originAddress" TEXT,
    "destinationCity" TEXT NOT NULL,
    "destinationAddress" TEXT,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "estimatedDuration" INTEGER NOT NULL DEFAULT 180,
    "distance" DOUBLE PRECISION,
    "pricePerSeat" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "totalSeats" INTEGER NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "carModel" TEXT,
    "description" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GuestRideStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestRide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "pickupAddress" TEXT,
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "externalRef" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rideId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "VerificationCode_userId_type_idx" ON "VerificationCode"("userId", "type");

-- CreateIndex
CREATE INDEX "Ride_driverId_idx" ON "Ride"("driverId");

-- CreateIndex
CREATE INDEX "Ride_originCity_destinationCity_idx" ON "Ride"("originCity", "destinationCity");

-- CreateIndex
CREATE INDEX "Ride_departureTime_idx" ON "Ride"("departureTime");

-- CreateIndex
CREATE INDEX "Ride_status_idx" ON "Ride"("status");

-- CreateIndex
CREATE INDEX "GuestRide_originCity_destinationCity_idx" ON "GuestRide"("originCity", "destinationCity");

-- CreateIndex
CREATE INDEX "GuestRide_departureTime_idx" ON "GuestRide"("departureTime");

-- CreateIndex
CREATE INDEX "GuestRide_status_idx" ON "GuestRide"("status");

-- CreateIndex
CREATE INDEX "Booking_passengerId_idx" ON "Booking"("passengerId");

-- CreateIndex
CREATE INDEX "Booking_rideId_idx" ON "Booking"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_rideId_passengerId_key" ON "Booking"("rideId", "passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_payerId_idx" ON "Payment"("payerId");

-- CreateIndex
CREATE INDEX "Payment_externalId_idx" ON "Payment"("externalId");

-- CreateIndex
CREATE INDEX "Conversation_rideId_idx" ON "Conversation"("rideId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_receiverId_idx" ON "Message"("receiverId");

-- CreateIndex
CREATE INDEX "Review_targetId_idx" ON "Review"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_targetId_rideId_key" ON "Review"("authorId", "targetId", "rideId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
