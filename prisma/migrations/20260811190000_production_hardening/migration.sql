-- Add expiration to email verification codes and indexes for the application's
-- tenant-scoped, date-ordered production queries. IF NOT EXISTS makes this
-- migration safe for an existing Neon database that was previously managed
-- with `prisma db push`.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerificationCodeExpires" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_shopId_isActive_idx" ON "User"("shopId", "isActive");
CREATE INDEX IF NOT EXISTS "Product_shopId_updatedAt_idx" ON "Product"("shopId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Product_shopId_barcode_idx" ON "Product"("shopId", "barcode");
CREATE INDEX IF NOT EXISTS "Product_shopId_stockQuantity_idx" ON "Product"("shopId", "stockQuantity");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_supplierId_idx" ON "Product"("supplierId");
CREATE INDEX IF NOT EXISTS "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "Sale_shopId_createdAt_idx" ON "Sale"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "Sale_shopId_saleStatus_idx" ON "Sale"("shopId", "saleStatus");
CREATE INDEX IF NOT EXISTS "Sale_cashierId_idx" ON "Sale"("cashierId");
CREATE INDEX IF NOT EXISTS "Sale_customerId_idx" ON "Sale"("customerId");
CREATE INDEX IF NOT EXISTS "Sale_installmentCustomerId_idx" ON "Sale"("installmentCustomerId");
CREATE INDEX IF NOT EXISTS "InstallmentPayment_saleId_createdAt_idx" ON "InstallmentPayment"("saleId", "createdAt");
CREATE INDEX IF NOT EXISTS "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX IF NOT EXISTS "SaleItem_productId_idx" ON "SaleItem"("productId");
CREATE INDEX IF NOT EXISTS "Return_shopId_createdAt_idx" ON "Return"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");
CREATE INDEX IF NOT EXISTS "ReturnItem_productId_idx" ON "ReturnItem"("productId");
CREATE INDEX IF NOT EXISTS "ReturnInstallmentPayment_returnItemId_createdAt_idx" ON "ReturnInstallmentPayment"("returnItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_shopId_createdAt_idx" ON "PurchaseOrder"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_shopId_status_idx" ON "PurchaseOrder"("shopId", "status");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");
CREATE INDEX IF NOT EXISTS "StockCount_shopId_startedAt_idx" ON "StockCount"("shopId", "startedAt");
CREATE INDEX IF NOT EXISTS "StockCountItem_stockCountId_idx" ON "StockCountItem"("stockCountId");
CREATE INDEX IF NOT EXISTS "StockCountItem_productId_idx" ON "StockCountItem"("productId");
CREATE INDEX IF NOT EXISTS "Expense_shopId_date_idx" ON "Expense"("shopId", "date");
CREATE INDEX IF NOT EXISTS "Reminder_shopId_isActive_dueDate_idx" ON "Reminder"("shopId", "isActive", "dueDate");
CREATE INDEX IF NOT EXISTS "Activity_shopId_createdAt_idx" ON "Activity"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "Activity_shopId_action_createdAt_idx" ON "Activity"("shopId", "action", "createdAt");
