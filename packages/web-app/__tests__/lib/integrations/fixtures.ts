import type { ExportDataSet, ExportInvoice } from "@/lib/integrations/shared";

/**
 * Build a complete ExportDataSet with 10 sample invoices covering key scenarios.
 */
export function buildExportDataSet(): ExportDataSet {
  const organization: ExportDataSet["organization"] = {
    id: "org-001",
    name: "Acme Services Pvt Ltd",
    legalName: "Acme Services Private Limited",
    gstin: "27AABCA1234F1Z5",
    placeOfBusinessState: "27", // Maharashtra
    pan: "AABCA1234F",
    bankName: "State Bank of India",
    bankAccountNumber: "1234567890",
    bankIfsc: "SBIN0001234",
    address: "123 MG Road",
    city: "Mumbai",
    email: "billing@acme.com",
    phone: "9876543210",
  };

  const customerMH = {
    id: "cust-001",
    name: "Mumbai Trading Co",
    email: "trade@mumbai.com",
    phone: "9876543211",
    address: "456 Marine Drive",
    city: "Mumbai",
    gstin: "27BBBCD5678E1Z3",
    billingState: "27",
    organizationId: "org-001",
    status: "ACTIVE" as const,
    category: "default",
    shippingState: "27",
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  const customerKA = {
    id: "cust-002",
    name: "Bangalore Tech & Solutions",
    email: "tech@bangalore.com",
    phone: "9876543212",
    address: "789 MG Road",
    city: "Bengaluru",
    gstin: "29CCCDE9012F1Z1",
    billingState: "29",
    organizationId: "org-001",
    status: "ACTIVE" as const,
    category: "default",
    shippingState: "29",
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  const customerUnreg = {
    id: "cust-003",
    name: "Local Shop",
    email: "shop@local.com",
    phone: "9876543213",
    address: "10 Main St",
    city: "Mumbai",
    gstin: null,
    billingState: "27",
    organizationId: "org-001",
    status: "ACTIVE" as const,
    category: "default",
    shippingState: "27",
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  const baseInvoice = {
    organizationId: "org-001",
    contractId: null,
    notes: null,
    deletedAt: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    type: "SERVICE" as const,
  };

  function makeItem(
    invoiceId: string,
    desc: string,
    qty: number,
    ratePaise: number,
    gstRate: number,
    isInterState: boolean,
  ) {
    const amount = qty * ratePaise;
    const taxable = amount;
    const totalTax = Math.round(taxable * (gstRate / 100));
    return {
      id: `item-${invoiceId}-${desc.slice(0, 4)}`,
      organizationId: "org-001",
      invoiceId,
      description: desc,
      qty,
      rate: ratePaise,
      amount,
      hsnSac: "998314",
      gstRatePercent: Object.assign(() => gstRate, { valueOf: () => gstRate, toNumber: () => gstRate, toString: () => String(gstRate) }) as any,
      taxableAmount: taxable,
      cgstAmount: isInterState ? 0 : Math.round(totalTax / 2),
      sgstAmount: isInterState ? 0 : Math.round(totalTax / 2),
      igstAmount: isInterState ? totalTax : 0,
    };
  }

  // Invoice 1: Intra-state, single item, 18% GST (MH→MH)
  const inv1Items = [makeItem("inv-001", "AMC Service - Monthly", 1, 1000_00, 18, false)];
  const inv1: ExportInvoice = {
    ...baseInvoice,
    id: "inv-001",
    invoiceNumber: "INV-2026-001",
    customerId: "cust-001",
    customer: customerMH,
    isInterState: false,
    placeOfSupply: "27",
    subtotalAmount: 1000_00,
    cgstAmount: 90_00,
    sgstAmount: 90_00,
    igstAmount: 0,
    totalTaxAmount: 180_00,
    amount: 1180_00,
    paidAmount: 0,
    issuedDate: new Date("2026-01-15"),
    dueDate: new Date("2026-02-15"),
    status: "ISSUED",
    items: inv1Items,
    payments: [],
  } as unknown as ExportInvoice;

  // Invoice 2: Inter-state, single item, 18% GST (MH→KA)
  const inv2Items = [makeItem("inv-002", "Pest Control - Quarterly", 1, 2000_00, 18, true)];
  const inv2: ExportInvoice = {
    ...baseInvoice,
    id: "inv-002",
    invoiceNumber: "INV-2026-002",
    customerId: "cust-002",
    customer: customerKA,
    isInterState: true,
    placeOfSupply: "29",
    subtotalAmount: 2000_00,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 360_00,
    totalTaxAmount: 360_00,
    amount: 2360_00,
    paidAmount: 0,
    issuedDate: new Date("2026-01-20"),
    dueDate: new Date("2026-02-20"),
    status: "ISSUED",
    items: inv2Items,
    payments: [],
  } as unknown as ExportInvoice;

  // Invoice 3: Intra-state, mixed GST rates (5% + 18%)
  const inv3Items = [
    makeItem("inv-003", "Water Purifier Filter", 2, 500_00, 5, false),
    makeItem("inv-003", "AC Service", 1, 1500_00, 18, false),
  ];
  const inv3: ExportInvoice = {
    ...baseInvoice,
    id: "inv-003",
    invoiceNumber: "INV-2026-003",
    customerId: "cust-001",
    customer: customerMH,
    isInterState: false,
    placeOfSupply: "27",
    subtotalAmount: 2500_00,
    cgstAmount: 25_00 + 135_00,
    sgstAmount: 25_00 + 135_00,
    igstAmount: 0,
    totalTaxAmount: 320_00,
    amount: 2820_00,
    paidAmount: 0,
    issuedDate: new Date("2026-01-22"),
    dueDate: new Date("2026-02-22"),
    status: "ISSUED",
    items: inv3Items,
    payments: [],
  } as unknown as ExportInvoice;

  // Invoice 4: Inter-state, 28% GST (luxury goods)
  const inv4Items = [makeItem("inv-004", "Premium HVAC Installation", 1, 5000_00, 28, true)];
  const inv4: ExportInvoice = {
    ...baseInvoice,
    id: "inv-004",
    invoiceNumber: "INV-2026-004",
    customerId: "cust-002",
    customer: customerKA,
    isInterState: true,
    placeOfSupply: "29",
    subtotalAmount: 5000_00,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 1400_00,
    totalTaxAmount: 1400_00,
    amount: 6400_00,
    paidAmount: 0,
    issuedDate: new Date("2026-01-25"),
    dueDate: new Date("2026-02-25"),
    status: "ISSUED",
    items: inv4Items,
    payments: [],
  } as unknown as ExportInvoice;

  // Invoice 5: Zero-rated / exempt supply
  const inv5Items = [makeItem("inv-005", "Exempt Agricultural Service", 1, 3000_00, 0, false)];
  const inv5: ExportInvoice = {
    ...baseInvoice,
    id: "inv-005",
    invoiceNumber: "INV-2026-005",
    customerId: "cust-003",
    customer: customerUnreg,
    isInterState: false,
    placeOfSupply: "27",
    subtotalAmount: 3000_00,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTaxAmount: 0,
    amount: 3000_00,
    paidAmount: 0,
    issuedDate: new Date("2026-01-28"),
    dueDate: new Date("2026-02-28"),
    status: "ISSUED",
    items: inv5Items,
    payments: [],
  } as unknown as ExportInvoice;

  // Invoice 6: Composition scheme placeholder
  const inv6Items = [makeItem("inv-006", "General Maintenance", 1, 4000_00, 0, false)];
  const inv6: ExportInvoice = {
    ...baseInvoice,
    id: "inv-006",
    invoiceNumber: "INV-2026-006",
    customerId: "cust-003",
    customer: customerUnreg,
    isInterState: false,
    placeOfSupply: "27",
    subtotalAmount: 4000_00,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTaxAmount: 0,
    amount: 4000_00,
    paidAmount: 0,
    issuedDate: new Date("2026-01-30"),
    dueDate: new Date("2026-03-01"),
    status: "ISSUED",
    notes: "Composition Scheme - Bill of Supply",
    items: inv6Items,
    payments: [],
  } as unknown as ExportInvoice;

  // Invoice 7: Fully paid
  const inv7Items = [makeItem("inv-007", "Plumbing Repair", 1, 800_00, 18, false)];
  const inv7: ExportInvoice = {
    ...baseInvoice,
    id: "inv-007",
    invoiceNumber: "INV-2026-007",
    customerId: "cust-001",
    customer: customerMH,
    isInterState: false,
    placeOfSupply: "27",
    subtotalAmount: 800_00,
    cgstAmount: 72_00,
    sgstAmount: 72_00,
    igstAmount: 0,
    totalTaxAmount: 144_00,
    amount: 944_00,
    paidAmount: 944_00,
    issuedDate: new Date("2026-02-01"),
    dueDate: new Date("2026-03-01"),
    status: "PAID",
    items: inv7Items,
    payments: [
      {
        id: "pay-007",
        invoiceId: "inv-007",
        razorpayOrderId: "order_abc123",
        razorpayPaymentId: "pay_xyz789",
        amount: 944_00,
        refundedAmountPaisa: 0,
        status: "captured",
        method: "razorpay",
        createdAt: new Date("2026-02-05"),
        refunds: [],
      },
    ],
  } as unknown as ExportInvoice;

  // Invoice 8: Partially paid
  const inv8Items = [makeItem("inv-008", "Electrical Work", 1, 2000_00, 18, false)];
  const inv8: ExportInvoice = {
    ...baseInvoice,
    id: "inv-008",
    invoiceNumber: "INV-2026-008",
    customerId: "cust-001",
    customer: customerMH,
    isInterState: false,
    placeOfSupply: "27",
    subtotalAmount: 2000_00,
    cgstAmount: 180_00,
    sgstAmount: 180_00,
    igstAmount: 0,
    totalTaxAmount: 360_00,
    amount: 2360_00,
    paidAmount: 1000_00,
    issuedDate: new Date("2026-02-05"),
    dueDate: new Date("2026-03-05"),
    status: "PARTIAL",
    items: inv8Items,
    payments: [
      {
        id: "pay-008",
        invoiceId: "inv-008",
        razorpayOrderId: "order_def456",
        razorpayPaymentId: "pay_ghi012",
        amount: 1000_00,
        refundedAmountPaisa: 0,
        status: "captured",
        method: "bank_transfer",
        createdAt: new Date("2026-02-10"),
        refunds: [],
      },
    ],
  } as unknown as ExportInvoice;

  // Invoice 9: Full refund
  const inv9Items = [makeItem("inv-009", "Cancelled Installation", 1, 1500_00, 18, true)];
  const inv9: ExportInvoice = {
    ...baseInvoice,
    id: "inv-009",
    invoiceNumber: "INV-2026-009",
    customerId: "cust-002",
    customer: customerKA,
    isInterState: true,
    placeOfSupply: "29",
    subtotalAmount: 1500_00,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 270_00,
    totalTaxAmount: 270_00,
    amount: 1770_00,
    paidAmount: 1770_00,
    issuedDate: new Date("2026-02-10"),
    dueDate: new Date("2026-03-10"),
    status: "REFUNDED",
    items: inv9Items,
    payments: [
      {
        id: "pay-009",
        invoiceId: "inv-009",
        razorpayOrderId: "order_jkl789",
        razorpayPaymentId: "pay_mno345",
        amount: 1770_00,
        refundedAmountPaisa: 1770_00,
        status: "captured",
        method: "razorpay",
        createdAt: new Date("2026-02-12"),
        refunds: [
          {
            id: "ref-009",
            paymentId: "pay-009",
            razorpayRefundId: "rfnd_pqr678",
            amountPaisa: 1770_00,
            reason: "Customer cancelled service",
            status: "PROCESSED",
            notes: {},
            initiatedById: "user-001",
            createdAt: new Date("2026-02-15"),
            processedAt: new Date("2026-02-15"),
          },
        ],
      },
    ],
  } as unknown as ExportInvoice;

  // Invoice 10: Partial refund
  const inv10Items = [makeItem("inv-010", "AC Maintenance Contract", 1, 3000_00, 18, false)];
  const inv10: ExportInvoice = {
    ...baseInvoice,
    id: "inv-010",
    invoiceNumber: "INV-2026-010",
    customerId: "cust-001",
    customer: customerMH,
    isInterState: false,
    placeOfSupply: "27",
    subtotalAmount: 3000_00,
    cgstAmount: 270_00,
    sgstAmount: 270_00,
    igstAmount: 0,
    totalTaxAmount: 540_00,
    amount: 3540_00,
    paidAmount: 3540_00,
    issuedDate: new Date("2026-02-15"),
    dueDate: new Date("2026-03-15"),
    status: "PARTIALLY_REFUNDED",
    items: inv10Items,
    payments: [
      {
        id: "pay-010",
        invoiceId: "inv-010",
        razorpayOrderId: "order_stu012",
        razorpayPaymentId: "pay_vwx345",
        amount: 3540_00,
        refundedAmountPaisa: 1000_00,
        status: "captured",
        method: "upi",
        createdAt: new Date("2026-02-18"),
        refunds: [
          {
            id: "ref-010",
            paymentId: "pay-010",
            razorpayRefundId: "rfnd_yza678",
            amountPaisa: 1000_00,
            reason: "Partial service not rendered",
            status: "PROCESSED",
            notes: {},
            initiatedById: "user-001",
            createdAt: new Date("2026-02-20"),
            processedAt: new Date("2026-02-20"),
          },
        ],
      },
    ],
  } as unknown as ExportInvoice;

  const invoices = [inv1, inv2, inv3, inv4, inv5, inv6, inv7, inv8, inv9, inv10];

  const customers: ExportDataSet["customers"] = [
    { id: customerMH.id, name: customerMH.name, email: customerMH.email, phone: customerMH.phone, address: customerMH.address, city: customerMH.city, gstin: customerMH.gstin, billingState: customerMH.billingState },
    { id: customerKA.id, name: customerKA.name, email: customerKA.email, phone: customerKA.phone, address: customerKA.address, city: customerKA.city, gstin: customerKA.gstin, billingState: customerKA.billingState },
    { id: customerUnreg.id, name: customerUnreg.name, email: customerUnreg.email, phone: customerUnreg.phone, address: customerUnreg.address, city: customerUnreg.city, gstin: customerUnreg.gstin, billingState: customerUnreg.billingState },
  ];

  return { organization, invoices, customers };
}
