import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    
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

    const sales = await prisma.sale.findMany({
      where: startDate ? { createdAt: { gte: startDate } } : {},
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: startDate ? { 
        createdAt: { gte: startDate },
        status: 'RECEIVED'
      } : { status: 'RECEIVED' },
      include: {
        items: true
      }
    });

    const expenses = await prisma.expense.findMany({
      where: startDate ? { date: { gte: startDate } } : {}
    });

    const returns = await prisma.returnItem.findMany({
      where: startDate ? { createdAt: { gte: startDate } } : {},
      include: { product: true }
    });

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
      
      if (paidBy === 'BUSINESS') {
        totalReturnLoss += priceDiff;
      } else if (paidBy === 'CLIENT') {
        totalReturnProfit += priceDiff;
        totalTopUpReceived += priceDiff;
      }
      
      totalRefundsGiven += refundAmount;
      totalRepairCosts += repairCost;
      
      if (refundAmount > 0) {
        if (!returnBreakdown['REFUND']) {
          returnBreakdown['REFUND'] = { type: 'Cash Refund', amount: 0, count: 0, isLoss: true };
        }
        returnBreakdown['REFUND'].amount += refundAmount;
        returnBreakdown['REFUND'].count += 1;
      }
      
      if (repairCost > 0) {
        if (!returnBreakdown['REPAIR']) {
          returnBreakdown['REPAIR'] = { type: 'Repair Costs', amount: 0, count: 0, isLoss: true };
        }
        returnBreakdown['REPAIR'].amount += repairCost;
        returnBreakdown['REPAIR'].count += 1;
      }
      
      if (item.awardedType === 'STORE_CREDIT') {
        totalStoreCredits += item.awardedAmount;
        if (!returnBreakdown['STORE_CREDIT']) {
          returnBreakdown['STORE_CREDIT'] = { type: 'Store Credit', amount: 0, count: 0, isLoss: true };
        }
        returnBreakdown['STORE_CREDIT'].amount += item.awardedAmount;
        returnBreakdown['STORE_CREDIT'].count += 1;
      }
      
      if (priceDiff > 0 && paidBy === 'BUSINESS') {
        if (!returnBreakdown['PRICE_DIFF_BUSINESS']) {
          returnBreakdown['PRICE_DIFF_BUSINESS'] = { type: 'Price Diff (Business Paid)', amount: 0, count: 0, isLoss: true };
        }
        returnBreakdown['PRICE_DIFF_BUSINESS'].amount += priceDiff;
        returnBreakdown['PRICE_DIFF_BUSINESS'].count += 1;
      }
      
      if (priceDiff > 0 && paidBy === 'CLIENT') {
        if (!returnBreakdown['TOP_UP']) {
          returnBreakdown['TOP_UP'] = { type: 'Top-Up (Customer Paid)', amount: 0, count: 0, isLoss: false };
        }
        returnBreakdown['TOP_UP'].amount += priceDiff;
        returnBreakdown['TOP_UP'].count += 1;
      }
    }

    totalReturnLoss = totalRefundsGiven + totalRepairCosts + (totalReturnLoss - totalTopUpReceived);
    
    const returnExpensesList = Object.values(returnBreakdown);

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

    const productList = Object.entries(productBreakdown)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.profit - a.profit);

    let totalPurchaseCost = 0;
    for (const po of purchaseOrders) {
      totalPurchaseCost += po.totalAmount;
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const expenseBreakdown: Record<string, number> = {};
    for (const exp of expenses) {
      if (!expenseBreakdown[exp.category]) {
        expenseBreakdown[exp.category] = 0;
      }
      expenseBreakdown[exp.category] += exp.amount;
    }

    const expenseList = Object.entries(expenseBreakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const netProfit = totalProfit - totalExpenses - totalReturnLoss + totalReturnProfit;

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
      returnExpensesList
    });
  } catch (error) {
    console.error('Profit/Loss error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
