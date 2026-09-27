-- CreateIndex
CREATE INDEX "User_clubId_isVerified_idx" ON "User"("clubId", "isVerified");

-- CreateIndex
CREATE INDEX "User_verificationExpiresAt_idx" ON "User"("verificationExpiresAt");
