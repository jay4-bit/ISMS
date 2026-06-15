import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const shopId = request.headers.get('x-shop-id');
    
    let startDate: Date | undefined;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case '7days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '12months':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = undefined;
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;
    const shopFilter = shopId ? { shopId } : {};

    const sales = await prisma.sale.findMany({
      where: { ...shopFilter, createdAt: dateFilter },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        ...shopFilter,
        status: 'RECEIVED',
        createdAt: dateFilter
      },
      include: {
        items: true
      }
    });

    const expenses = await prisma.expense.findMany({
      where: { ...shopFilter, date: dateFilter }
    });

    // Maintenance expenses linked to return items (via RETURN_ITEM: reference) are already
    // counted as repairCost in totalReturnLoss — exclude them to avoid double-counting
    const maintenanceExpenses = expenses.filter(e => e.category === 'MAINTENANCE' && e.reference?.startsWith('RETURN_ITEM:'));
    const maintenanceExpenseIds = new Set(maintenanceExpenses.map(e => e.id));
    const nonMaintenanceExpenses = expenses.filter(e => !maintenanceExpenseIds.has(e.id));

    const returns = await prisma.returnItem.findMany({
      where: {
        return: { ...shopFilter },
        createdAt: dateFilter
      },
      include: {
        product: { select: { id: true, name: true, purchaseCost: true } },
        return: { select: { shopId: true, returnNumber: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Collect replacement product IDs to fetch their purchase costs
    const replacementIds = returns
      .filter(r => r.awardedType === 'REPLACEMENT' && r.replacementProductId)
      .map(r => r.replacementProductId!);
    const replacementProducts = replacementIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: replacementIds } }, select: { id: true, purchaseCost: true } })
      : [];
    const replacementCostMap = new Map(replacementProducts.map(p => [p.id, p.purchaseCost]));

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const productBreakdown: Record<string, { 
      name: string; 
      quantity: number; 
      revenue: number; 
      cost: number; 
      profit: number;
    }> = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        const revenue = item.unitPrice * item.quantity;
        const cost = item.product.purchaseCost * item.quantity;
        const profit = revenue - cost;
        
        totalRevenue += revenue;
        totalCost += cost;
        totalProfit += profit;

        const productId = item.productId;
        if (!productBreakdown[productId]) {
          productBreakdown[productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0
          };
        }
        productBreakdown[productId].quantity += item.quantity;
        productBreakdown[productId].revenue += revenue;
        productBreakdown[productId].cost += cost;
        productBreakdown[productId].profit += profit;
      }
    }

    let totalReturnLoss = 0;
    let totalReturnProfit = 0;
    let totalRefundsGiven = 0;
    let totalStoreCredits = 0;
    let totalRepairCosts = 0;
    let totalTopUpReceived = 0;
    
    const returnBreakdown: Record<string, { 
      type: string;
      amount: number;
      count: number;
      isLoss: boolean;
    }> = {};

    for (const item of returns) {
      const refundAmount = item.refundAmount || 0;
      const repairCost = item.repairCost || 0;
      const priceDiff = item.priceDifference || 0;
      const paidBy = item.differencePaidBy || 'CLIENT';
      const productCost = (item.product?.purchaseCost || 0) * item.quantity;
      const returnProcCost = item.returnCost || 0;
      const awardedType = item.awardedType || 'REFUND';
      const isResellable = item.status === 'RESELLABLE';
      
      totalRefundsGiven += refundAmount;
      totalRepairCosts += repairCost;
      
      // === REVENUE ADJUSTMENTS ===
      if (refundAmount > 0) {
        totalRevenue -= refundAmount;
      }
      if (awardedType === 'REPLACEMENT' && priceDiff > 0) {
        if (paidBy === 'BUSINESS') {
          const refundGiven = item.replacementRefundGiven || priceDiff;
          totalRevenue -= refundGiven;
        } else {
          const collectedAmount = item.replacementPaidAmount || priceDiff;
          totalRevenue += collectedAmount;
          totalTopUpReceived += collectedAmount;
          // Discount is already reflected in collectedAmount (lower than priceDiff)
        }
      }
      if (awardedType !== 'REPLACEMENT' && paidBy === 'CLIENT' && priceDiff > 0) {
        totalRevenue += priceDiff;
        totalTopUpReceived += priceDiff;
      }
      
      // === COGS & RETURN COSTS ===
      // The returned product came back — remove its purchase cost from COGS (unless REPAIR)
      if (awardedType !== 'REPAIR') {
        totalCost -= productCost;
      }
      
      // The returnCost (processing/handling/repair fee) is the ONLY cost of the return
      // The product's purchase cost is NOT a loss — it goes back to inventory for resale
      if (returnProcCost > 0 && awardedType !== 'REPAIR') {
        totalReturnLoss += returnProcCost;
      }
      
      // Replacement product given to customer: its purchase cost is a return cost (not COGS)
      if (awardedType === 'REPLACEMENT' && item.replacementProductId) {
        const repCost = (replacementCostMap.get(item.replacementProductId) || 0) * item.quantity;
        if (repCost > 0) {
          totalReturnLoss += repCost;
        }
      }
      
      // Business-paid price difference (non-replacement) is a return cost
      if (awardedType !== 'REPLACEMENT' && paidBy === 'BUSINESS' && priceDiff > 0) {
        totalReturnLoss += priceDiff;
      }
      
      // Repair cost is a return cost
      if (repairCost > 0) {
        totalReturnLoss += repairCost;
      }
      
      // === PRODUCT BREAKDOWN ===
      if (productBreakdown[item.productId]) {
        productBreakdown[item.productId].quantity -= isResellable ? item.quantity : 0;
        productBreakdown[item.productId].revenue -= refundAmount;
        productBreakdown[item.productId].cost -= (isResellable && awardedType !== 'REPAIR') ? productCost : 0;
        productBreakdown[item.productId].profit -= refundAmount;
      }
      
      // === RETURN BREAKDOWN ===
      if (awardedType === 'STORE_CREDIT' && item.awardedAmount > 0) {
        totalStoreCredits += item.awardedAmount;
        if (!returnBreakdown['STORE_CREDIT']) {
          returnBreakdown['STORE_CREDIT'] = { type: 'Store Credit Given', amount: 0, count: 0, isLoss: true };
        }
        returnBreakdown['STORE_CREDIT'].amount += item.awardedAmount;
        returnBreakdown['STORE_CREDIT'].count += 1;
      }
      if (refundAmount > 0) {
        if (!returnBreakdown['REFUND']) {
          returnBreakdown['REFUND'] = { type: 'Cash Refunded', amount: 0, count: 0, isLoss: true };
        }
        returnBreakdown['REFUND'].amount += refundAmount;
        returnBreakdown['REFUND'].count += 1;
      }
      if (returnProcCost > 0) {
        if (!returnBreakdown['RETURN_COST']) {
          returnBreakdown['RETURN_COST'] = { type: 'Return Processing Cost', amount: 0, count: 0, isLoss: true };
        }
        returnBreakdown['RETURN_COST'].amount += returnProcCost;
        returnBreakdown['RETURN_COST'].count += 1;
      }
      if (awardedType === 'REPLACEMENT' && item.replacementProductId) {
        const repCost = (replacementCostMap.get(item.replacementProductId) || 0) * item.quantity;
        if (repCost > 0) {
          if (!returnBreakdown['REPLACEMENT_COST']) {
            returnBreakdown['REPLACEMENT_COST'] = { type: 'Replacement Product Cost', amount: 0, count: 0, isLoss: true };
          }
          returnBreakdown['REPLACEMENT_COST'].amount += repCost;
          returnBreakdown['REPLACEMENT_COST'].count += 1;
        }
      }
      if (repairCost > 0) {
        if (!returnBreakdown['REPAIR']) {
          returnBreakdown['REPAIR'] = { type: 'Repair Costs', amount: 0, count: 0, isLoss: true };
        }
        returnBreakdown['REPAIR'].amount += repairCost;
        returnBreakdown['REPAIR'].count += 1;
      }
      if (priceDiff > 0) {
        if (paidBy === 'BUSINESS' && awardedType !== 'REPLACEMENT') {
          if (!returnBreakdown['PRICE_DIFF_BUSINESS']) {
            returnBreakdown['PRICE_DIFF_BUSINESS'] = { type: 'Price Diff (Business Paid)', amount: 0, count: 0, isLoss: true };
          }
          returnBreakdown['PRICE_DIFF_BUSINESS'].amount += priceDiff;
          returnBreakdown['PRICE_DIFF_BUSINESS'].count += 1;
        }
        if (paidBy === 'CLIENT') {
          const collected = item.replacementPaidAmount || priceDiff;
          if (!returnBreakdown['TOP_UP']) {
            returnBreakdown['TOP_UP'] = { type: 'Customer Top-Up', amount: 0, count: 0, isLoss: false };
          }
          returnBreakdown['TOP_UP'].amount += collected;
          returnBreakdown['TOP_UP'].count += 1;
        }
      }
    }
    
    const returnExpensesList = Object.values(returnBreakdown);

    const returnItemsList = returns.map(item => ({
      returnNumber: item.return.returnNumber,
      returnDate: item.return.createdAt,
      productName: item.product?.name || 'Unknown',
      awardedType: item.awardedType || 'REFUND',
      refundAmount: item.refundAmount || 0,
      returnCost: item.returnCost || 0,
      repairCost: item.repairCost || 0,
      replacementProductName: item.replacementProductName || null,
      priceDifference: item.priceDifference || 0,
      differencePaidBy: item.differencePaidBy || 'CLIENT',
      status: item.status,
      quantity: item.quantity,
    }));
    
    // Gross Profit = revenue minus actual COGS (after return reversals)
    totalProfit = totalRevenue - totalCost;

    const productList = Object.entries(productBreakdown)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.profit - a.profit);

    let totalPurchaseCost = 0;
    for (const po of purchaseOrders) {
      totalPurchaseCost += po.totalAmount;
    }

    const totalExpenses = nonMaintenanceExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const expenseBreakdown: Record<string, number> = {};
    for (const exp of nonMaintenanceExpenses) {
      if (!expenseBreakdown[exp.category]) {
        expenseBreakdown[exp.category] = 0;
      }
      expenseBreakdown[exp.category] += exp.amount;
    }

    const expenseList = Object.entries(expenseBreakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Net Profit = Gross Profit - Return Costs - Operating Expenses
    const netProfit = totalProfit - totalReturnLoss - totalExpenses;

    return NextResponse.json({
      totalRevenue,
      totalCost,
      totalProfit,
      totalPurchaseCost,
      totalExpenses,
      totalReturnLoss,
      totalReturnProfit,
      totalRefundsGiven,
      totalStoreCredits,
      totalRepairCosts,
      totalTopUpReceived,
      netProfit,
      salesCount: sales.length,
      period,
      productList,
      expenseList,
      returnExpensesList,
      returnItemsList
    });
  } catch (error) {
    console.error('Profit/Loss error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
