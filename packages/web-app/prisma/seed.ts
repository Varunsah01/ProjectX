import "dotenv/config";
import { createHash } from "node:crypto";
import { hash } from "bcrypt";
import {
  AssetStatus,
  BillingCycle,
  ContractStatus,
  ContractType,
  CustomerStatus,
  InvoiceStatus,
  InvoiceType,
  JobStatus,
  JobType,
  PrismaClient,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@prisma/client";
import { addBillingCycle } from "../lib/billing";
import {
  assets,
  contracts,
  customers,
  invoices,
  jobs,
  plans,
  teamMembers,
  technicians,
  tickets,
} from "../lib/mock-data";

const prisma = new PrismaClient();

const IST_OFFSET = "+05:30";
const ORGANIZATION_ID = uuidFromKey("organization:project-x-services");

type TimelineActor = {
  legacyId: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  lastActiveAt: Date;
};

const customerIdByLegacyId = new Map(
  customers.map((customer) => [customer.id, uuidFromKey(`customer:${customer.id}`)]),
);

const assetIdByLegacyId = new Map(
  assets.map((asset) => [asset.id, uuidFromKey(`asset:${asset.id}`)]),
);

const planInputs = buildPlanInputs();
const planIdByLegacyId = new Map(
  planInputs.map((plan) => [plan.legacyId, uuidFromKey(`plan:${plan.legacyId}`)]),
);
const planIdByName = new Map(
  planInputs.map((plan) => [plan.name, planIdByLegacyId.get(plan.legacyId)!]),
);

const teamUserIds = new Map(
  teamMembers.map((member) => [member.id, uuidFromKey(`user:${member.id}`)]),
);

const technicianUserIds = new Map(
  technicians.map((technician) => [technician.id, uuidFromKey(`user:${technician.id}`)]),
);

const timelineActorInputs = buildTimelineActors();
const timelineActorIds = new Map(
  timelineActorInputs.map((actor) => [actor.legacyId, actor.id]),
);

const userIdByName = new Map<string, string>();
for (const member of teamMembers) {
  userIdByName.set(member.name, teamUserIds.get(member.id)!);
}
for (const technician of technicians) {
  userIdByName.set(technician.name, technicianUserIds.get(technician.id)!);
}
for (const actor of timelineActorInputs) {
  userIdByName.set(actor.name, actor.id);
}

const ticketIdByLegacyId = new Map(
  tickets.map((ticket) => [ticket.id, uuidFromKey(`ticket:${ticket.id}`)]),
);

const contractIdByLegacyId = new Map(
  contracts.map((contract) => [contract.id, uuidFromKey(`contract:${contract.id}`)]),
);

async function main() {
  const defaultPasswordHash = await hash("ChangeMe123!", 10);
  const testAdminPasswordHash = await hash("password123", 10);

  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.job.deleteMany();
  await prisma.ticketTimeline.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  await prisma.organization.create({
    data: {
      id: ORGANIZATION_ID,
      name: "Project X Services",
      slug: "project-x-services",
      logo: null,
      phone: "+91 90000 00000",
      email: "hello@projectx.in",
      address: "MG Road, Jaipur",
      city: "Jaipur",
      gstin: "08AABCP1234A1Z5",
      placeOfBusinessState: "08",
      createdAt: toDateTime("2021-01-01T09:00:00"),
      updatedAt: toDateTime("2025-03-26T10:00:00"),
    },
  });

  await prisma.user.createMany({
    data: [
      {
        id: uuidFromKey("user:admin-test"),
        organizationId: ORGANIZATION_ID,
        name: "Test Admin",
        email: "admin@test.com",
        emailVerified: new Date(),
        passwordHash: testAdminPasswordHash,
        role: UserRole.ADMIN,
        status: "ACTIVE",
        avatar: null,
        image: null,
        phone: null,
        territory: null,
        specialization: null,
        skills: [],
        activeJobs: 0,
        completedToday: 0,
        rating: 0,
        totalJobs: 0,
        avgRating: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        lastActiveAt: new Date(),
        createdAt: new Date(),
      },
      ...teamMembers.map((member) => ({
        id: teamUserIds.get(member.id)!,
        organizationId: ORGANIZATION_ID,
        name: member.name,
        email: member.email,
        emailVerified: null,
        passwordHash: defaultPasswordHash,
        role: roleFromTeamMember(member.role),
        status: toUpperSnakeCase(member.status),
        avatar: null,
        image: null,
        phone: null,
        territory: null,
        specialization: null,
        skills: [],
        activeJobs: 0,
        completedToday: 0,
        rating: 0,
        totalJobs: 0,
        avgRating: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        lastActiveAt: toDateTime(member.lastActive),
        createdAt: toDateTime(member.lastActive),
      })),
      ...technicians.map((technician) => ({
        id: technicianUserIds.get(technician.id)!,
        organizationId: ORGANIZATION_ID,
        name: technician.name,
        email: technician.email,
        emailVerified: null,
        passwordHash: defaultPasswordHash,
        role: UserRole.TECHNICIAN,
        status: toUpperSnakeCase(technician.status),
        avatar: null,
        image: null,
        phone: technician.phone,
        territory: technician.territory,
        specialization: technician.specialization,
        skills: technician.skills,
        activeJobs: technician.activeJobs,
        completedToday: technician.completedToday,
        rating: technician.rating,
        totalJobs: technician.totalJobs,
        avgRating: technician.avgRating,
        completedThisWeek: technician.completedThisWeek,
        completedThisMonth: technician.completedThisMonth,
        lastActiveAt: latestTechnicianActivity(technician.id),
        createdAt: toDate(technician.joinDate),
      })),
      ...timelineActorInputs.map((actor) => ({
        id: actor.id,
        organizationId: ORGANIZATION_ID,
        name: actor.name,
        email: actor.email,
        emailVerified: new Date(),
        passwordHash: defaultPasswordHash,
        role: actor.role,
        status: "ACTIVE",
        avatar: null,
        image: null,
        phone: null,
        territory: null,
        specialization: null,
        skills: [],
        activeJobs: 0,
        completedToday: 0,
        rating: 0,
        totalJobs: 0,
        avgRating: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        lastActiveAt: actor.lastActiveAt,
        createdAt: actor.createdAt,
      })),
    ],
  });

  await prisma.orgMembership.createMany({
    data: [
      {
        userId: uuidFromKey("user:admin-test"),
        organizationId: ORGANIZATION_ID,
        role: UserRole.ADMIN,
      },
      ...teamMembers.map((member) => ({
        userId: teamUserIds.get(member.id)!,
        organizationId: ORGANIZATION_ID,
        role: roleFromTeamMember(member.role),
      })),
      ...technicians.map((technician) => ({
        userId: technicianUserIds.get(technician.id)!,
        organizationId: ORGANIZATION_ID,
        role: UserRole.TECHNICIAN,
      })),
      ...timelineActorInputs.map((actor) => ({
        userId: actor.id,
        organizationId: ORGANIZATION_ID,
        role: actor.role,
      })),
    ],
    skipDuplicates: true,
  });

  await prisma.plan.createMany({
    data: planInputs.map((plan) => {
      const relatedContractDates = contracts
        .filter((contract) => contract.plan === plan.name)
        .map((contract) => contract.startDate)
        .sort();
      const createdAt = toDate(relatedContractDates[0] ?? "2024-01-01");

      return {
        id: planIdByLegacyId.get(plan.legacyId)!,
        organizationId: ORGANIZATION_ID,
        name: plan.name,
        type: contractTypeFromMock(plan.type),
        durationMonths: plan.duration,
        price: plan.price,
        visitsCovered: plan.visitsCovered,
        description: plan.description,
        isActive: plan.isActive,
        hsnSac: "998714",
        gstRatePercent: 18,
        gstApplicable: true,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });

  await prisma.customer.createMany({
    data: customers.map((customer) => ({
      id: customerIdByLegacyId.get(customer.id)!,
      organizationId: ORGANIZATION_ID,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      gstin: customer.gst ?? null,
      status: customerStatusFromMock(customer.status),
      category: customer.category,
      createdAt: toDate(customer.createdAt),
      updatedAt: toDate(customer.createdAt),
    })),
  });

  await prisma.asset.createMany({
    data: assets.map((asset) => {
      const customer = customers.find((entry) => entry.id === asset.customerId)!;
      return {
        id: assetIdByLegacyId.get(asset.id)!,
        organizationId: ORGANIZATION_ID,
        customerId: customerIdByLegacyId.get(asset.customerId)!,
        name: asset.name,
        model: asset.model,
        serialNumber: asset.serialNumber,
        category: asset.category,
        installationDate: toDate(asset.installationDate),
        warrantyEnd: toDate(asset.warrantyEnd),
        status: assetStatusFromMock(asset.status),
        location: `${customer.address}, ${customer.city}`,
        notes: null,
        amcStatus: asset.amcStatus,
        lastServiceDate: toDate(asset.lastServiceDate),
        nextServiceDate: toDate(asset.nextServiceDate),
        createdAt: toDate(asset.installationDate),
        updatedAt: toDate(asset.lastServiceDate),
      };
    }),
  });

  await prisma.contract.createMany({
    data: contracts.map((contract) => ({
      id: contractIdByLegacyId.get(contract.id)!,
      organizationId: ORGANIZATION_ID,
      contractNumber: contract.contractNumber,
      customerId: customerIdByLegacyId.get(contract.customerId)!,
      assetId: assetIdByLegacyId.get(contract.assetId)!,
      planId: planIdByName.get(contract.plan)!,
      type: contractTypeFromMock(contract.type),
      billingCycle: BillingCycle.YEARLY,
      startDate: toDate(contract.startDate),
      endDate: toDate(contract.endDate),
      nextBillingDate: addBillingCycle(toDate(contract.startDate), BillingCycle.YEARLY),
      lastBilledDate: null,
      status: contractStatusFromMock(contract.status),
      value: contract.value,
      visitsCovered: contract.visitsCovered,
      visitsUsed: contract.visitsUsed,
      nextServiceDate: toDate(contract.nextServiceDate),
      notes: null,
      createdAt: toDate(contract.startDate),
      updatedAt: toDate(contract.nextServiceDate),
    })),
  });

  await prisma.invoice.createMany({
    data: invoices.map((invoice) => ({
      id: uuidFromKey(`invoice:${invoice.id}`),
      organizationId: ORGANIZATION_ID,
      invoiceNumber: invoice.invoiceNumber,
      customerId: customerIdByLegacyId.get(invoice.customerId)!,
      contractId: null,
      amount: invoice.amount,
      paidAmount: invoice.paidAmount,
      dueDate: toDate(invoice.dueDate),
      issuedDate: toDate(invoice.issuedDate),
      status: invoiceStatusFromMock(invoice.status),
      type: invoiceTypeFromMock(invoice.type),
      notes: null,
      createdAt: toDate(invoice.issuedDate),
      updatedAt: toDate(invoice.issuedDate),
    })),
  });

  const invoiceIdByLegacyId = new Map(
    invoices.map((invoice) => [invoice.id, uuidFromKey(`invoice:${invoice.id}`)]),
  );

  await prisma.invoiceItem.createMany({
    data: invoices.flatMap((invoice) =>
      invoice.items.map((item, index) => ({
        id: uuidFromKey(`invoice-item:${invoice.id}:${index}`),
        organizationId: ORGANIZATION_ID,
        invoiceId: invoiceIdByLegacyId.get(invoice.id)!,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
      })),
    ),
  });

  await prisma.ticket.createMany({
    data: tickets.map((ticket) => ({
      id: ticketIdByLegacyId.get(ticket.id)!,
      organizationId: ORGANIZATION_ID,
      ticketNumber: ticket.ticketNumber,
      customerId: customerIdByLegacyId.get(ticket.customerId)!,
      assetId: ticket.assetId ? assetIdByLegacyId.get(ticket.assetId)! : null,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticketPriorityFromMock(ticket.priority),
      status: ticketStatusFromMock(ticket.status),
      assignedToId: ticket.assignedTechnicianId
        ? technicianUserIds.get(ticket.assignedTechnicianId)!
        : null,
      slaDeadline: toDateTime(ticket.slaDeadline),
      resolvedAt: ticket.resolvedAt ? toDateTime(ticket.resolvedAt) : null,
      createdAt: toDateTime(ticket.createdAt),
      updatedAt: toDateTime(ticket.updatedAt),
    })),
  });

  await prisma.ticketTimeline.createMany({
    data: tickets.flatMap((ticket) =>
      ticket.timeline.map((event, index) => ({
        id: uuidFromKey(`ticket-timeline:${ticket.id}:${index}`),
        organizationId: ORGANIZATION_ID,
        ticketId: ticketIdByLegacyId.get(ticket.id)!,
        byUserId: resolveUserIdForActor(event.by),
        action: event.action,
        note: event.note ?? null,
        createdAt: toDateTime(event.date),
      })),
    ),
  });

  await prisma.job.createMany({
    data: jobs.map((job) => ({
      id: uuidFromKey(`job:${job.id}`),
      organizationId: ORGANIZATION_ID,
      jobNumber: job.jobNumber,
      ticketId: job.ticketId ? ticketIdByLegacyId.get(job.ticketId)! : null,
      customerId: customerIdByLegacyId.get(job.customerId)!,
      assetId: job.assetId ? assetIdByLegacyId.get(job.assetId)! : null,
      technicianId: technicianUserIds.get(job.technicianId)!,
      type: jobTypeFromMock(job.type),
      status: jobStatusFromMock(job.status),
      scheduledDate: toDate(job.scheduledDate),
      completedAt: job.completedAt ? toDateTime(job.completedAt) : null,
      notes: job.notes ?? null,
      serviceReport: job.serviceReport ?? null,
      createdAt: job.ticketId
        ? toDateTime(tickets.find((ticket) => ticket.id === job.ticketId)!.createdAt)
        : toDate(job.scheduledDate),
      updatedAt: job.completedAt ? toDateTime(job.completedAt) : toDate(job.scheduledDate),
    })),
  });

  const totalUsers = 1 + teamMembers.length + technicians.length + timelineActorInputs.length;
  console.log(
    `Seeded 1 organization, ${totalUsers} users (including admin@test.com / password123) and ${totalUsers} org memberships, ${customers.length} customers, ${assets.length} assets, ${contracts.length} contracts, ${invoices.length} invoices, ${tickets.length} tickets, and ${jobs.length} jobs.`,
  );
}

function buildPlanInputs() {
  const output = plans.map((plan) => ({ ...plan, legacyId: plan.id }));
  if (!output.some((plan) => plan.name === "Standard Warranty")) {
    output.push({
      legacyId: "P010",
      id: "P010",
      name: "Standard Warranty",
      type: "warranty" as const,
      duration: 12,
      price: 0,
      visitsCovered: 2,
      description: "Standard manufacturer warranty coverage",
      isActive: true,
    });
  }
  return output;
}

function buildTimelineActors(): TimelineActor[] {
  const knownNames = new Set([
    ...teamMembers.map((member) => member.name),
    ...technicians.map((technician) => technician.name),
  ]);

  const actorEvents = new Map<string, string[]>();
  for (const ticket of tickets) {
    for (const event of ticket.timeline) {
      if (knownNames.has(event.by)) {
        continue;
      }
      const entries = actorEvents.get(event.by) ?? [];
      entries.push(event.date);
      actorEvents.set(event.by, entries);
    }
  }

  return Array.from(actorEvents.entries()).map(([name, dates]) => {
    const sorted = [...dates].sort();
    return {
      legacyId: `actor:${name}`,
      id: uuidFromKey(`user:actor:${name}`),
      name,
      email: `${toSlug(name)}@seed.projectx.local`,
      role: name === "Ops Manager" ? UserRole.MANAGER : UserRole.AGENT,
      createdAt: toDateTime(sorted[0]),
      lastActiveAt: toDateTime(sorted[sorted.length - 1]),
    };
  });
}

function latestTechnicianActivity(legacyTechnicianId: string) {
  const dates = [
    ...tickets
      .filter((ticket) => ticket.assignedTechnicianId === legacyTechnicianId)
      .flatMap((ticket) => [ticket.createdAt, ticket.updatedAt, ticket.resolvedAt].filter(Boolean) as string[]),
    ...jobs
      .filter((job) => job.technicianId === legacyTechnicianId)
      .flatMap((job) => [job.completedAt, `${job.scheduledDate}T09:00:00`].filter(Boolean) as string[]),
  ].sort();

  return dates.length > 0
    ? toDateTime(dates[dates.length - 1])
    : toDate("2025-03-01");
}

function resolveUserIdForActor(actorName: string) {
  const actorId =
    userIdByName.get(actorName) ??
    timelineActorIds.get(`actor:${actorName}`);

  if (!actorId) {
    throw new Error(`Missing seeded user for timeline actor: ${actorName}`);
  }

  return actorId;
}

function roleFromTeamMember(role: (typeof teamMembers)[number]["role"]) {
  switch (role) {
    case "admin":
      return UserRole.ADMIN;
    case "manager":
      return UserRole.MANAGER;
    case "agent":
      return UserRole.AGENT;
    case "technician":
      return UserRole.TECHNICIAN;
  }
}

function customerStatusFromMock(status: (typeof customers)[number]["status"]) {
  switch (status) {
    case "active":
      return CustomerStatus.ACTIVE;
    case "inactive":
      return CustomerStatus.INACTIVE;
    case "suspended":
      return CustomerStatus.SUSPENDED;
  }
}

function assetStatusFromMock(status: (typeof assets)[number]["status"]) {
  switch (status) {
    case "active":
      return AssetStatus.ACTIVE;
    case "inactive":
      return AssetStatus.INACTIVE;
    case "under_repair":
      return AssetStatus.UNDER_REPAIR;
  }
}

function contractTypeFromMock(type: (typeof contracts)[number]["type"] | (typeof plans)[number]["type"]) {
  return type === "amc" ? ContractType.AMC : ContractType.WARRANTY;
}

function contractStatusFromMock(status: (typeof contracts)[number]["status"]) {
  switch (status) {
    case "active":
      return ContractStatus.ACTIVE;
    case "expired":
      return ContractStatus.EXPIRED;
    case "expiring_soon":
      return ContractStatus.EXPIRING_SOON;
    case "renewed":
      return ContractStatus.RENEWED;
    case "cancelled":
      return ContractStatus.CANCELLED;
  }
}

function invoiceStatusFromMock(status: (typeof invoices)[number]["status"]) {
  switch (status) {
    case "draft":
      return InvoiceStatus.DRAFT;
    case "issued":
      return InvoiceStatus.ISSUED;
    case "paid":
      return InvoiceStatus.PAID;
    case "overdue":
      return InvoiceStatus.OVERDUE;
    case "partial":
      return InvoiceStatus.PARTIAL;
    case "cancelled":
      return InvoiceStatus.CANCELLED;
  }
}

function invoiceTypeFromMock(type: (typeof invoices)[number]["type"]) {
  switch (type) {
    case "recurring":
      return InvoiceType.RECURRING;
    case "one_time":
      return InvoiceType.ONE_TIME;
    case "service":
      return InvoiceType.SERVICE;
  }
}

function ticketPriorityFromMock(priority: (typeof tickets)[number]["priority"]) {
  switch (priority) {
    case "low":
      return TicketPriority.LOW;
    case "medium":
      return TicketPriority.MEDIUM;
    case "high":
      return TicketPriority.HIGH;
    case "critical":
      return TicketPriority.CRITICAL;
  }
}

function ticketStatusFromMock(status: (typeof tickets)[number]["status"]) {
  switch (status) {
    case "open":
      return TicketStatus.OPEN;
    case "assigned":
      return TicketStatus.ASSIGNED;
    case "in_progress":
      return TicketStatus.IN_PROGRESS;
    case "on_hold":
      return TicketStatus.ON_HOLD;
    case "resolved":
      return TicketStatus.RESOLVED;
    case "closed":
      return TicketStatus.CLOSED;
    case "reopened":
      return TicketStatus.REOPENED;
  }
}

function jobTypeFromMock(type: (typeof jobs)[number]["type"]) {
  switch (type) {
    case "complaint":
      return JobType.COMPLAINT;
    case "scheduled":
      return JobType.SCHEDULED;
    case "installation":
      return JobType.INSTALLATION;
    case "inspection":
      return JobType.INSPECTION;
  }
}

function jobStatusFromMock(status: (typeof jobs)[number]["status"]) {
  switch (status) {
    case "pending":
      return JobStatus.PENDING;
    case "assigned":
      return JobStatus.ASSIGNED;
    case "en_route":
      return JobStatus.EN_ROUTE;
    case "in_progress":
      return JobStatus.IN_PROGRESS;
    case "completed":
      return JobStatus.COMPLETED;
    case "cancelled":
      return JobStatus.CANCELLED;
  }
}

function toUpperSnakeCase(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00${IST_OFFSET}`);
}

function toDateTime(value: string) {
  if (/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return new Date(value);
  }
  return new Date(`${value}${IST_OFFSET}`);
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function uuidFromKey(key: string) {
  const hash = createHash("sha1").update(key).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// ---------------------------------------------------------------------------
// Large-scale seed for performance testing (SEED_SCALE=large)
// ---------------------------------------------------------------------------

async function seedLargeDataset() {
  const NUM_ORGS = 5;
  const CUSTOMERS_PER_ORG = 200;
  const ASSETS_PER_ORG = 400;
  const CONTRACTS_PER_ORG = 300;
  const INVOICES_PER_ORG = 5000;
  const TICKETS_PER_ORG = 2000;
  const JOBS_PER_ORG = 3000;
  const TECHS_PER_ORG = 50;
  const BATCH_SIZE = 500;

  const passwordHash = await hash("test1234", 10);

  const jobStatuses: JobStatus[] = [
    JobStatus.PENDING, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS,
    JobStatus.EN_ROUTE, JobStatus.COMPLETED, JobStatus.CANCELLED,
  ];
  const jobTypes: JobType[] = [
    JobType.COMPLAINT, JobType.SCHEDULED, JobType.INSTALLATION, JobType.INSPECTION,
  ];
  const invoiceStatuses: InvoiceStatus[] = [
    InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE,
    InvoiceStatus.PARTIAL, InvoiceStatus.PAID, InvoiceStatus.CANCELLED,
  ];
  const ticketStatuses: TicketStatus[] = [
    TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS,
    TicketStatus.ON_HOLD, TicketStatus.RESOLVED, TicketStatus.CLOSED,
  ];
  const ticketPriorities: TicketPriority[] = [
    TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.CRITICAL,
  ];
  const contractStatuses: ContractStatus[] = [
    ContractStatus.ACTIVE, ContractStatus.EXPIRING_SOON, ContractStatus.EXPIRED,
    ContractStatus.RENEWED, ContractStatus.CANCELLED,
  ];

  function pick<T>(arr: T[], i: number): T {
    return arr[i % arr.length];
  }

  function dayOffset(base: Date, days: number) {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  const baseDate = new Date();

  for (let orgIdx = 0; orgIdx < NUM_ORGS; orgIdx++) {
    const orgKey = `perf-org-${orgIdx}`;
    const orgId = uuidFromKey(orgKey);
    console.log(`  Creating org ${orgIdx + 1}/${NUM_ORGS} (${orgId})...`);

    await prisma.organization.create({
      data: {
        id: orgId,
        name: `PerfTest Org ${orgIdx}`,
        slug: `perftest-${orgIdx}`,
        phone: `900000000${orgIdx}`,
        email: `admin@perftest${orgIdx}.example.com`,
        address: "123 Perf Street",
        city: "Mumbai",
      },
    });

    // Admin user
    const adminId = uuidFromKey(`${orgKey}-admin`);
    await prisma.user.create({
      data: {
        id: adminId,
        organizationId: orgId,
        name: `Admin ${orgIdx}`,
        email: `admin@perftest${orgIdx}.example.com`,
        phone: `900000100${orgIdx}`,
        passwordHash,
        role: UserRole.ADMIN,
        status: "available",
        emailVerified: new Date(),
      },
    });

    // Technicians
    const techIds: string[] = [];
    for (let batch = 0; batch < TECHS_PER_ORG; batch += BATCH_SIZE) {
      const chunk = Math.min(BATCH_SIZE, TECHS_PER_ORG - batch);
      await prisma.user.createMany({
        data: Array.from({ length: chunk }, (_, j) => {
          const i = batch + j;
          const id = uuidFromKey(`${orgKey}-tech-${i}`);
          techIds.push(id);
          return {
            id,
            organizationId: orgId,
            name: `Tech ${i} Org${orgIdx}`,
            email: `tech${i}@perftest${orgIdx}.example.com`,
            phone: `91000${String(orgIdx).padStart(2, "0")}${String(i).padStart(4, "0")}`,
            passwordHash,
            role: UserRole.TECHNICIAN,
            emailVerified: new Date(),
            status: pick(["available", "on_job", "en_route", "offline"], i),
            rating: 3 + (i % 3),
            specialization: pick(["HVAC", "Plumbing", "Electrical", "General"], i),
          };
        }),
      });
    }

    // Customers
    const customerIds: string[] = [];
    for (let batch = 0; batch < CUSTOMERS_PER_ORG; batch += BATCH_SIZE) {
      const chunk = Math.min(BATCH_SIZE, CUSTOMERS_PER_ORG - batch);
      await prisma.customer.createMany({
        data: Array.from({ length: chunk }, (_, j) => {
          const i = batch + j;
          const id = uuidFromKey(`${orgKey}-cust-${i}`);
          customerIds.push(id);
          return {
            id,
            organizationId: orgId,
            name: `Customer ${i} Org${orgIdx}`,
            phone: `92000${String(orgIdx).padStart(2, "0")}${String(i).padStart(4, "0")}`,
            email: `cust${i}@perftest${orgIdx}.example.com`,
            address: `${100 + i} Test Street`,
            city: pick(["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"], i),
            status: pick([CustomerStatus.ACTIVE, CustomerStatus.ACTIVE, CustomerStatus.ACTIVE, CustomerStatus.INACTIVE], i),
            category: pick(["residential", "commercial"], i),
          };
        }),
      });
    }

    // Assets
    const assetIds: string[] = [];
    for (let batch = 0; batch < ASSETS_PER_ORG; batch += BATCH_SIZE) {
      const chunk = Math.min(BATCH_SIZE, ASSETS_PER_ORG - batch);
      await prisma.asset.createMany({
        data: Array.from({ length: chunk }, (_, j) => {
          const i = batch + j;
          const id = uuidFromKey(`${orgKey}-asset-${i}`);
          assetIds.push(id);
          const installDate = dayOffset(baseDate, -(365 + (i % 300)));
          return {
            id,
            organizationId: orgId,
            customerId: customerIds[i % customerIds.length],
            name: `Asset ${i}`,
            category: pick(["AC", "Purifier", "Heater", "Lift", "Generator"], i),
            model: `Model-${i % 20}`,
            serialNumber: `SN-${orgIdx}-${i}`,
            status: AssetStatus.ACTIVE,
            installationDate: installDate,
            warrantyEnd: dayOffset(installDate, 365),
          };
        }),
      });
    }

    // Plans (a few per org)
    const planIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = uuidFromKey(`${orgKey}-plan-${i}`);
      planIds.push(id);
    }
    await prisma.plan.createMany({
      data: planIds.map((id, i) => ({
        id,
        organizationId: orgId,
        name: `Plan ${i}`,
        type: pick([ContractType.AMC, ContractType.WARRANTY], i),
        durationMonths: 12,
        price: 5000 + i * 1000,
        visitsCovered: 4 + i,
        description: `Performance test plan ${i}`,
        hsnSac: "998719",
        gstRatePercent: 18,
        isActive: true,
      })),
    });

    // Contracts
    const contractIds: string[] = [];
    for (let batch = 0; batch < CONTRACTS_PER_ORG; batch += BATCH_SIZE) {
      const chunk = Math.min(BATCH_SIZE, CONTRACTS_PER_ORG - batch);
      await prisma.contract.createMany({
        data: Array.from({ length: chunk }, (_, j) => {
          const i = batch + j;
          const id = uuidFromKey(`${orgKey}-contract-${i}`);
          contractIds.push(id);
          const start = dayOffset(baseDate, -(180 + (i % 365)));
          const end = dayOffset(start, 365);
          return {
            id,
            organizationId: orgId,
            contractNumber: `CON-${orgIdx}-${String(i).padStart(5, "0")}`,
            customerId: customerIds[i % customerIds.length],
            assetId: assetIds[i % assetIds.length],
            planId: planIds[i % planIds.length],
            type: pick([ContractType.AMC, ContractType.WARRANTY], i),
            status: pick(contractStatuses, i),
            startDate: start,
            endDate: end,
            value: 5000 + (i % 20) * 500,
            billingCycle: BillingCycle.QUARTERLY,
            visitsCovered: 4,
            visitsUsed: i % 5,
            nextBillingDate: dayOffset(baseDate, 30 + (i % 90)),
          };
        }),
      });
    }

    // Invoices
    for (let batch = 0; batch < INVOICES_PER_ORG; batch += BATCH_SIZE) {
      const chunk = Math.min(BATCH_SIZE, INVOICES_PER_ORG - batch);
      await prisma.invoice.createMany({
        data: Array.from({ length: chunk }, (_, j) => {
          const i = batch + j;
          const id = uuidFromKey(`${orgKey}-inv-${i}`);
          const issuedDate = dayOffset(baseDate, -(i % 365));
          const dueDate = dayOffset(issuedDate, 15);
          const amount = 1000 + (i % 50) * 200;
          const status = pick(invoiceStatuses, i);
          const paidAmount = status === InvoiceStatus.PAID ? amount
            : status === InvoiceStatus.PARTIAL ? Math.floor(amount * 0.5)
            : 0;
          return {
            id,
            organizationId: orgId,
            invoiceNumber: `INV-${orgIdx}-${String(i).padStart(6, "0")}`,
            customerId: customerIds[i % customerIds.length],
            contractId: i < contractIds.length ? contractIds[i] : null,
            amount,
            paidAmount,
            dueDate,
            issuedDate,
            status,
            type: pick([InvoiceType.ONE_TIME, InvoiceType.RECURRING], i),
          };
        }),
      });
    }

    // Tickets
    for (let batch = 0; batch < TICKETS_PER_ORG; batch += BATCH_SIZE) {
      const chunk = Math.min(BATCH_SIZE, TICKETS_PER_ORG - batch);
      await prisma.ticket.createMany({
        data: Array.from({ length: chunk }, (_, j) => {
          const i = batch + j;
          const id = uuidFromKey(`${orgKey}-ticket-${i}`);
          const createdAt = dayOffset(baseDate, -(i % 180));
          const status = pick(ticketStatuses, i);
          const resolved = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;
          return {
            id,
            organizationId: orgId,
            ticketNumber: `TKT-${orgIdx}-${String(i).padStart(5, "0")}`,
            customerId: customerIds[i % customerIds.length],
            assetId: assetIds[i % assetIds.length],
            subject: `Issue ${i}`,
            description: `Perf test ticket description ${i}`,
            category: pick(["repair", "maintenance", "installation", "inspection"], i),
            priority: pick(ticketPriorities, i),
            status,
            assignedToId: i % 3 === 0 ? null : techIds[i % techIds.length],
            slaDeadline: dayOffset(createdAt, 3),
            resolvedAt: resolved ? dayOffset(createdAt, 1 + (i % 5)) : null,
            createdAt,
          };
        }),
      });
    }

    // Jobs
    for (let batch = 0; batch < JOBS_PER_ORG; batch += BATCH_SIZE) {
      const chunk = Math.min(BATCH_SIZE, JOBS_PER_ORG - batch);
      await prisma.job.createMany({
        data: Array.from({ length: chunk }, (_, j) => {
          const i = batch + j;
          const id = uuidFromKey(`${orgKey}-job-${i}`);
          const scheduledDate = dayOffset(baseDate, -(i % 180));
          const status = pick(jobStatuses, i);
          return {
            id,
            organizationId: orgId,
            jobNumber: `JOB-${orgIdx}-${String(i).padStart(5, "0")}`,
            customerId: customerIds[i % customerIds.length],
            assetId: assetIds[i % assetIds.length],
            technicianId: techIds[i % techIds.length],
            type: pick(jobTypes, i),
            status,
            scheduledDate,
            completedAt: status === JobStatus.COMPLETED ? dayOffset(scheduledDate, 1) : null,
          };
        }),
      });
    }

    console.log(`  Org ${orgIdx + 1} done.`);
  }

  const totalRows =
    NUM_ORGS * (1 + 1 + TECHS_PER_ORG + CUSTOMERS_PER_ORG + ASSETS_PER_ORG + 5 +
      CONTRACTS_PER_ORG + INVOICES_PER_ORG + TICKETS_PER_ORG + JOBS_PER_ORG);
  console.log(`\nLarge seed complete: ~${totalRows.toLocaleString()} rows across ${NUM_ORGS} orgs.`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function run() {
  await main();

  if (process.env.SEED_SCALE === "large") {
    console.log("\nSEED_SCALE=large — generating performance test dataset...\n");
    await seedLargeDataset();
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
