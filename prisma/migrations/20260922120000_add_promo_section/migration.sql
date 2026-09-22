-- CreateTable
CREATE TABLE "promo_sections" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "couponId" TEXT,
    "titleEn" TEXT,
    "titleBn" TEXT,
    "descriptionEn" TEXT,
    "descriptionBn" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_sections_couponId_key" ON "promo_sections"("couponId");

-- AddForeignKey
ALTER TABLE "promo_sections" ADD CONSTRAINT "promo_sections_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
