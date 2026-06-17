const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const r = await p.returnItem.findFirst({
    where: { awardedType: 'REPLACEMENT' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify({
    originalProductValue: r.originalProductValue,
    replacementProductPrice: r.replacementProductPrice,
    replacementProductName: r.replacementProductName,
    productId: r.productId,
    replacementProductId: r.replacementProductId,
    priceDifference: r.priceDifference,
    refundAmount: r.refundAmount,
    replacementRefundGiven: r.replacementRefundGiven,
    replacementPaidAmount: r.replacementPaidAmount,
    quantity: r.quantity,
  }, null, 2));
  await p.$disconnect();
}
main().catch(e => { console.error(e); p.$disconnect(); });
