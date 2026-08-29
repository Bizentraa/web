-- CC-P2-012: quotations and sales orders reuse the audited sale document model.
ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'QUOTATION';
ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'ORDER';
