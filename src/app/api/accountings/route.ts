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
        items: { include: { product: true } },
        installmentPayments: true,
        installmentCustomer: { select: { name: true } },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: { ...shopFilter, date: dateFilter },
    });

    const returns = await prisma.returnItem.findMany({
      where: {
        return: { ...shopFilter },
        createdAt: dateFilter,
      },
      include: {
        returnInstallmentPayments: true,
        product: { select: { purchaseCost: true } },
        return: { select: { refundMethod: true } },
      },
    });

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        ...shopFilter,
        status: 'RECEIVED',
        createdAt: dateFilter,
      },
    });

    const customers = await prisma.customer.findMany({
      where: shopFilter,
      select: {
        id: true,
        name: true,
        creditBalance: true,
        phone: true,
        totalPurchases: true,
      },
    });

    const totalInstallmentSales = sales.filter(s => s.isInstallment);
    await prisma.installmentPayment.findMany({
      where: {
        sale: { ...shopFilter },
        createdAt: dateFilter,
      },
    });

    // === PAYMENT METHOD BREAKDOWN (from sales) ===
    const paymentMethodBreakdown: Record<string, { count: number; totalAmount: number; totalPaid: number; totalChange: number }> = {};

    for (const sale of sales) {
      const method = sale.paymentMethod;
      if (!paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method] = { count: 0, totalAmount: 0, totalPaid: 0, totalChange: 0 };
      }
      paymentMethodBreakdown[method].count += 1;
      paymentMethodBreakdown[method].totalAmount += sale.total;
      paymentMethodBreakdown[method].totalPaid += sale.amountPaid;
      paymentMethodBreakdown[method].totalChange += sale.changeGiven;
    }

    const paymentMethods = Object.entries(paymentMethodBreakdown).map(([method, data]) => ({
      method,
      ...data,
    }));

    // === EXPENSE BREAKDOWN ===
    const expenseBreakdown: Record<string, number> = {};
    for (const exp of expenses) {
      const cat = exp.category;
      expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + exp.amount;
    }
    const expenseCategories = Object.entries(expenseBreakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // === DEBITS (money out) ===
    const totalChangeGiven = sales.reduce((sum, s) => sum + s.changeGiven, 0);
    const totalRefundsGiven = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const totalRepairCosts = returns.reduce((sum, r) => sum + (r.repairCost || 0), 0);
    const totalReturnCosts = returns.reduce((sum, r) => sum + (r.returnCost || 0), 0);
    const totalSupplierPayments = purchaseOrders.reduce((sum, po) => sum + po.paidAmount, 0);

    const totalDebits = totalExpenses + totalRefundsGiven + totalRepairCosts + totalReturnCosts + totalSupplierPayments + totalChangeGiven;

    // === CREDITORS (money owed to business) ===
    const totalCustomerCredit = customers.reduce((sum, c) => sum + c.creditBalance, 0);
    const totalInstallmentDue = totalInstallmentSales.reduce((sum, s) => sum + (s.installmentDue || 0), 0);

    const replacementInstallments = returns.filter(r => r.replacementIsInstallment);
    const totalReplacementInstallmentDue = replacementInstallments.reduce(
      (sum, r) => sum + ((r.replacementInstallmentTotal || 0) - (r.replacementInstallmentPaid || 0)),
      0,
    );

    const totalReceivables = totalCustomerCredit + totalInstallmentDue + totalReplacementInstallmentDue;

    // === INSTALLMENT DETAIL ===
    const installmentSalesList = totalInstallmentSales.map(s => ({
      id: s.id,
      receiptNumber: s.receiptNumber,
      customerName: s.installmentCustomer?.name || s.customerName || 'Unknown',
      totalAmount: s.installmentTotal || s.total,
      amountPaid: s.installmentPaid || 0,
      amountDue: s.installmentDue || 0,
      nextPaymentDate: s.nextPaymentDate,
      createdAt: s.createdAt,
      payments: s.installmentPayments.map(p => ({
        id: p.id,
        amountPaid: p.amountPaid,
        balance: p.balance,
        paidAt: p.paidAt,
      })),
    }));

    const replacementInstallmentsList = replacementInstallments.map(r => ({
      id: r.id,
      customerName: r.replacementInstallmentCustomerName || 'Unknown',
      totalAmount: r.replacementInstallmentTotal || 0,
      amountPaid: r.replacementInstallmentPaid || 0,
      amountDue: (r.replacementInstallmentTotal || 0) - (r.replacementInstallmentPaid || 0),
      payments: r.returnInstallmentPayments.map(p => ({
        id: p.id,
        amountPaid: p.amountPaid,
        balance: p.balance,
        paidAt: p.paidAt,
      })),
    }));

    // === CASH FLOW SUMMARY ===
    const totalCashInflow = sales.reduce((sum, s) => sum + s.amountPaid, 0);
    const totalCashOutflow = totalDebits;

    // === REFUND METHOD BREAKDOWN ===
    const refundMethodBreakdown: Record<string, { count: number; totalAmount: number }> = {};
    for (const ret of returns) {
      const method = ret.return?.refundMethod || 'CASH';
      if (!refundMethodBreakdown[method]) {
        refundMethodBreakdown[method] = { count: 0, totalAmount: 0 };
      }
      refundMethodBreakdown[method].count += 1;
      refundMethodBreakdown[method].totalAmount += ret.refundAmount || 0;
    }
    const refundMethods = Object.entries(refundMethodBreakdown).map(([method, data]) => ({
      method,
      ...data,
    }));

    return NextResponse.json({
      period,
      paymentMethods,
      expenseCategories,
      totalExpenses,
      totalChangeGiven,
      totalRefundsGiven,
      totalRepairCosts,
      totalReturnCosts,
      totalSupplierPayments,
      totalDebits,
      totalCustomerCredit,
      totalInstallmentDue,
      totalReplacementInstallmentDue,
      totalReceivables,
      totalCashInflow,
      totalCashOutflow,
      netCashFlow: totalCashInflow - totalCashOutflow,
      salesCount: sales.length,
      returnsCount: returns.length,
      customersWithCredit: customers.filter(c => c.creditBalance > 0).length,
      installmentSales: installmentSalesList,
      replacementInstallments: replacementInstallmentsList,
      refundMethods,
      customers: customers.filter(c => c.creditBalance > 0).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        creditBalance: c.creditBalance,
        totalPurchases: c.totalPurchases,
      })),
    });
  } catch (error) {
    console.error('Accountings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
