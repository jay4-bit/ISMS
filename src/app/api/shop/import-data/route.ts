import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id');
    const userId = request.headers.get('x-user-id');
    if (!shopId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the shop owner can import data' }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON data' }, { status: 400 });
    }

    const result = { imported: 0, skipped: 0, errors: [] as string[] };
    const idMap: Record<string, string> = {};

    await prisma.$transaction(async (tx) => {
      // 1. Categories
      for (const cat of (body.categories || [])) {
        const exists = await tx.category.findUnique({ where: { name_shopId: { name: cat.name, shopId } } }).catch(() => null);
        if (exists) { idMap[cat.id] = exists.id; result.skipped++; continue; }
        const created = await tx.category.create({
          data: { name: cat.name, description: cat.description, profitMargin: cat.profitMargin || 0, shopId },
        });
        idMap[cat.id] = created.id;
        result.imported++;
      }

      // 2. Brands
      for (const brand of (body.brands || [])) {
        const exists = await tx.brand.findUnique({ where: { name_shopId: { name: brand.name, shopId } } }).catch(() => null);
        if (exists) { idMap[brand.id] = exists.id; result.skipped++; continue; }
        const created = await tx.brand.create({ data: { name: brand.name, shopId } });
        idMap[brand.id] = created.id;
        result.imported++;
      }

      // 3. Suppliers
      for (const sup of (body.suppliers || [])) {
        const exists = await tx.supplier.findUnique({ where: { name_shopId: { name: sup.name, shopId } } }).catch(() => null);
        if (exists) { idMap[sup.id] = exists.id; result.skipped++; continue; }
        const created = await tx.supplier.create({
          data: {
            name: sup.name, email: sup.email, phone: sup.phone, address: sup.address,
            contactPerson: sup.contactPerson, notes: sup.notes, licenseNumber: sup.licenseNumber,
            isActive: sup.isActive ?? true, shopId,
          },
        });
        idMap[sup.id] = created.id;
        result.imported++;
      }

      // 4. Customers
      for (const cust of (body.customers || [])) {
        const exists = await tx.customer.findFirst({ where: { phone: cust.phone, shopId } }).catch(() => null);
        if (exists) { idMap[cust.id] = exists.id; result.skipped++; continue; }
        const created = await tx.customer.create({
          data: {
            name: cust.name, phone: cust.phone, email: cust.email, address: cust.address,
            prescriptionNumber: cust.prescriptionNumber,
            dateOfBirth: cust.dateOfBirth ? new Date(cust.dateOfBirth) : null,
            creditLimit: cust.creditLimit || 0, creditBalance: cust.creditBalance || 0,
            loyaltyPoints: cust.loyaltyPoints || 0, totalPurchases: cust.totalPurchases || 0,
            isActive: cust.isActive ?? true, shopId,
          },
        });
        idMap[cust.id] = created.id;
        result.imported++;
      }

      // 5. Products + subtypes
      for (const prod of (body.products || [])) {
        const exists = await tx.product.findUnique({ where: { sku_shopId: { sku: prod.sku, shopId } } }).catch(() => null);
        if (exists) { idMap[prod.id] = exists.id; result.skipped++; continue; }
        const categoryId = idMap[prod.categoryId] || prod.categoryId;
        const supplierId = prod.supplierId ? (idMap[prod.supplierId] || prod.supplierId) : null;
        const created = await tx.product.create({
          data: {
            name: prod.name, sku: prod.sku, barcode: prod.barcode, description: prod.description,
            categoryId, supplierId,
            purchaseCost: prod.purchaseCost || 0, sellingPrice: prod.sellingPrice || 0,
            wholesalePrice: prod.wholesalePrice, stockQuantity: prod.stockQuantity || 0,
            lowStockThreshold: prod.lowStockThreshold ?? 10, reorderPoint: prod.reorderPoint ?? 20,
            isFaulty: prod.isFaulty ?? false, hasExpiry: prod.hasExpiry ?? false,
            expiryDate: prod.expiryDate ? new Date(prod.expiryDate) : null,
            hasSerialNumber: prod.hasSerialNumber ?? false, weight: prod.weight,
            taxRate: prod.taxRate || 0, location: prod.location, imageUrl: prod.imageUrl,
            variant: prod.variant, variantType: prod.variantType, brand: prod.brand,
            shopId,
          },
        });
        idMap[prod.id] = created.id;
        result.imported++;

        // Product subtypes
        if (prod.pharmacyFields) {
          const pf = prod.pharmacyFields;
          await tx.pharmacyProduct.create({
            data: {
              productId: created.id, brandName: pf.brandName, genericName: pf.genericName,
              batchNumber: pf.batchNumber,
              manufacturingDate: pf.manufacturingDate ? new Date(pf.manufacturingDate) : null,
              expiryDate: pf.expiryDate ? new Date(pf.expiryDate) : null,
              dosage: pf.dosage, composition: pf.composition, manufacturer: pf.manufacturer,
              prescriptionRequired: pf.prescriptionRequired ?? false,
              requiresColdStorage: pf.requiresColdStorage ?? false,
              drugSchedule: pf.drugSchedule, sideEffects: pf.sideEffects,
              contraindications: pf.contraindications, interactionWarnings: pf.interactionWarnings,
              storageInstructions: pf.storageInstructions,
            },
          });
        }
        if (prod.liquorFields) {
          const lf = prod.liquorFields;
          await tx.liquorProduct.create({
            data: {
              productId: created.id, brand: lf.brand, size: lf.size, volume: lf.volume,
              liquorType: lf.liquorType, vintage: lf.vintage, origin: lf.origin,
              alcoholPercentage: lf.alcoholPercentage,
              requiresLiquorLicense: lf.requiresLiquorLicense ?? false,
              ageStatement: lf.ageStatement, notes: lf.notes,
            },
          });
        }
        if (prod.electronicsFields) {
          const ef = prod.electronicsFields;
          await tx.electronicsProduct.create({
            data: {
              productId: created.id, brand: ef.brand, model: ef.model, condition: ef.condition,
              imei: ef.imei, serialNumber: ef.serialNumber, color: ef.color, storage: ef.storage,
              warranty: ef.warranty, voltage: ef.voltage, wattage: ef.wattage,
              specifications: ef.specifications, weight: ef.weight, accessoryGroup: ef.accessoryGroup,
            },
          });
        }
        if (prod.clothingFields) {
          const cf = prod.clothingFields;
          await tx.clothingProduct.create({
            data: {
              productId: created.id, size: cf.size, color: cf.color, material: cf.material,
              brand: cf.brand, season: cf.season, gender: cf.gender, pattern: cf.pattern,
            },
          });
        }

        // Product variants
        for (const v of (prod.variants || [])) {
          const vExists = await tx.productVariant.findUnique({ where: { sku: v.sku } }).catch(() => null);
          if (vExists) { result.skipped++; continue; }
          await tx.productVariant.create({
            data: {
              productId: created.id, variantValue: v.variantValue, sku: v.sku, barcode: v.barcode,
              stockQuantity: v.stockQuantity || 0, sellingPrice: v.sellingPrice || 0,
              purchaseCost: v.purchaseCost,
            },
          });
        }

        // Price tags
        for (const pt of (prod.priceTags || [])) {
          await tx.priceTag.create({
            data: { productId: created.id, barcode: pt.barcode || '', printedBy: pt.printedBy },
          });
        }
      }

      // 6. Users (skip if email+shopId exists; skip owner records since owner already exists)
      for (const u of (body.users || [])) {
        if (u.role === 'OWNER') { result.skipped++; continue; }
        const exists = await tx.user.findUnique({ where: { email_shopId: { email: u.email, shopId } } }).catch(() => null);
        if (exists) { idMap[u.id] = exists.id; result.skipped++; continue; }
        const created = await tx.user.create({
          data: { email: u.email, password: u.password || 'placeholder', name: u.name, role: u.role || 'CASHIER', shopId },
        });
        idMap[u.id] = created.id;
        result.imported++;
      }

      // 7. Sales
      for (const sale of (body.sales || [])) {
        const exists = await tx.sale.findUnique({ where: { receiptNumber: sale.receiptNumber } }).catch(() => null);
        if (exists) { idMap[sale.id] = exists.id; result.skipped++; continue; }
        const cashierId = idMap[sale.cashierId] || sale.cashierId;
        const customerId = sale.customerId ? (idMap[sale.customerId] || sale.customerId) : null;
        const instCustId = sale.installmentCustomerId ? (idMap[sale.installmentCustomerId] || sale.installmentCustomerId) : null;
        const created = await tx.sale.create({
          data: {
            receiptNumber: sale.receiptNumber, subtotal: sale.subtotal || 0,
            taxAmount: sale.taxAmount || 0, discount: sale.discount || 0, total: sale.total || 0,
            paymentMethod: sale.paymentMethod || 'CASH', saleType: sale.saleType || 'RETAIL',
            amountPaid: sale.amountPaid || 0, changeGiven: sale.changeGiven || 0,
            customerId, installmentCustomerId: instCustId,
            customerName: sale.customerName, customerPhone: sale.customerPhone,
            customerAddress: sale.customerAddress,
            isInstallment: sale.isInstallment ?? false,
            installmentTotal: sale.installmentTotal, installmentPaid: sale.installmentPaid,
            installmentDue: sale.installmentDue, nextPaymentDate: sale.nextPaymentDate ? new Date(sale.nextPaymentDate) : null,
            saleStatus: sale.saleStatus || 'COMPLETE', isPaid: sale.isPaid ?? true,
            cashierId, shopId,
            createdAt: sale.createdAt ? new Date(sale.createdAt) : undefined,
          },
        });
        idMap[sale.id] = created.id;
        result.imported++;

        // Sale items
        for (const item of (sale.items || [])) {
          const productId = idMap[item.productId] || item.productId;
          await tx.saleItem.create({
            data: {
              saleId: created.id, productId,
              quantity: item.quantity || 1, unitPrice: item.unitPrice || 0,
              taxAmount: item.taxAmount || 0, discount: item.discount || 0,
              total: item.total || 0,
            },
          });
        }

        // Installment payments
        for (const ip of (sale.installmentPayments || [])) {
          await tx.installmentPayment.create({
            data: {
              saleId: created.id, amount: ip.amount || 0,
              amountPaid: ip.amountPaid || 0, balance: ip.balance || 0,
              dueDate: ip.dueDate ? new Date(ip.dueDate) : null,
              paidAt: ip.paidAt ? new Date(ip.paidAt) : null,
              notes: ip.notes,
              createdAt: ip.createdAt ? new Date(ip.createdAt) : undefined,
            },
          });
        }
      }

      // 8. Returns
      for (const ret of (body.returns || [])) {
        const exists = await tx.return.findUnique({ where: { returnNumber: ret.returnNumber } }).catch(() => null);
        if (exists) { idMap[ret.id] = exists.id; result.skipped++; continue; }
        const created = await tx.return.create({
          data: {
            returnNumber: ret.returnNumber, reason: ret.reason || '',
            refundMethod: ret.refundMethod, totalRefund: ret.totalRefund || 0,
            processedBy: idMap[ret.processedBy] || ret.processedBy || userId,
            shopId, createdAt: ret.createdAt ? new Date(ret.createdAt) : undefined,
          },
        });
        idMap[ret.id] = created.id;
        result.imported++;

        for (const ri of (ret.items || [])) {
          const productId = idMap[ri.productId] || ri.productId;
          await tx.returnItem.create({
            data: {
              returnId: created.id, productId, quantity: ri.quantity || 1,
              reason: ri.reason || '', status: ri.status || 'PENDING',
              refundAmount: ri.refundAmount || 0, supplierId: ri.supplierId,
              supplierName: ri.supplierName, awardedType: ri.awardedType || 'REFUND',
              awardedAmount: ri.awardedAmount || 0, repairCost: ri.repairCost || 0,
              returnCost: ri.returnCost || 0,
              replacementProductId: ri.replacementProductId,
              replacementProductName: ri.replacementProductName,
              replacementProductPrice: ri.replacementProductPrice,
              originalProductValue: ri.originalProductValue,
              priceDifference: ri.priceDifference || 0,
              differencePaidBy: ri.differencePaidBy || 'CLIENT',
              replacementPaymentMethod: ri.replacementPaymentMethod || null,
              replacementPaidAmount: ri.replacementPaidAmount || 0,
              replacementDiscount: ri.replacementDiscount || 0,
              replacementIsInstallment: ri.replacementIsInstallment || false,
              replacementInstallmentTotal: ri.replacementInstallmentTotal || null,
              replacementInstallmentPaid: ri.replacementInstallmentPaid || null,
              replacementInstallmentCustomerName: ri.replacementInstallmentCustomerName || null,
              replacementInstallmentCustomerPhone: ri.replacementInstallmentCustomerPhone || null,
              replacementRefundGiven: ri.replacementRefundGiven || 0,
              notes: ri.notes,
            },
          });
        }
      }

      // Import ReturnInstallmentPayments
      for (const rip of (body.returnInstallmentPayments || [])) {
        const returnItemId = idMap[rip.returnItemId] || rip.returnItemId;
        await tx.returnInstallmentPayment.create({
          data: {
            returnItemId,
            amount: rip.amount || 0,
            amountPaid: rip.amountPaid || 0,
            balance: rip.balance || 0,
            paidAt: rip.paidAt ? new Date(rip.paidAt) : null,
            notes: rip.notes || null,
            createdAt: rip.createdAt ? new Date(rip.createdAt) : undefined,
          },
        });
        result.imported++;
      }

      // 9. Expenses
      for (const exp of (body.expenses || [])) {
        await tx.expense.create({
          data: {
            description: exp.description || '', amount: exp.amount || 0,
            category: exp.category || 'OTHER', date: exp.date ? new Date(exp.date) : new Date(),
            reference: exp.reference, createdBy: idMap[exp.createdBy] || exp.createdBy || userId,
            shopId,
          },
        });
        result.imported++;
      }

      // 10. Activities
      for (const act of (body.recentActivities || [])) {
        await tx.activity.create({
          data: {
            shopId, userId: idMap[act.userId] || act.userId || userId,
            userName: act.userName || 'Imported', action: act.action || 'DATA_IMPORT',
            details: act.details || '', createdAt: act.createdAt ? new Date(act.createdAt) : undefined,
          },
        });
        result.imported++;
      }
    }, { timeout: 120000 });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Import data error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to import data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
