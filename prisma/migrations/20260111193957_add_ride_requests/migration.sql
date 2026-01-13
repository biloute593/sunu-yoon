-- CreateTable
CREATE TABLE "RideRequest" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "seats" INTEGER NOT NULL,
    "maxPricePerSeat" INTEGER,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedByDriverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_acceptedByDriverId_fkey" FOREIGN KEY ("acceptedByDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
