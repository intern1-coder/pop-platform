const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DUMMY_USERS = [
  { email: 'admin@pop.test', password: 'Admin123!', firstName: 'Pop', lastName: 'Admin', role: 'Admin' },
  { email: 'manager@pop.test', password: 'Manager123!', firstName: 'Pop', lastName: 'Manager', role: 'PropertyManager' },
  { email: 'tenant@pop.test', password: 'Tenant123!', firstName: 'Pop', lastName: 'Tenant', role: 'Tenant' },
  // A 2nd tenant so complaint ownership can be split across tenants and the
  // role-scoping on /api/complaints is visibly different per role:
  //   Admin      -> sees all 5 complaints (org scope)
  //   tenant@pop  -> sees 3 (the ones below still owned by tenant@pop.test)
  //   sarah@pop   -> sees 2 (CMP-2025-0003, CMP-2025-0004)
  { email: 'sarah@pop.test', password: 'Sarah123!', firstName: 'Sarah', lastName: 'Tenant', role: 'Tenant' },
];

const DEMO_PROPERTIES = [
  {
    name: 'Riverside Court',
    address: '12 Riverside Drive',
    type: 'Residential',
    status: 'Active',
    units: ['Flat 1', 'Flat 2', 'Flat 3', 'Flat 4'],
  },
  {
    name: 'Meadow View Flats',
    address: '48 Meadow Lane',
    type: 'Residential',
    status: 'Active',
    units: ['Unit A', 'Unit B', 'Unit C'],
  },
];

const DEMO_COMPANIES = [
  { alias: 'omnia', fullName: 'Omnia Housing Group', address: 'Omnia House, 1 Market Street, Manchester M3 4BR' },
  { alias: 'apollo', fullName: 'Apollo Housing', address: 'Apollo House, 7 Riverside, Leeds LS1 4XY' },
  { alias: 'redstone', fullName: 'Redstone Homes', address: 'Redstone Court, 99 High Road, Birmingham B1 4AB' },
];

const DEMO_COMPLAINTS = [
  {
    reference: 'CMP-2025-0001',
    tenantName: 'Pop Tenant',
    tenantEmail: 'tenant@pop.test',
    tenantPhone: '01234567890',
    category: 'Anti-Social Behaviour',
    severity: 'High',
    status: 'In Progress',
    description:
      'Persistent damp and black mould visible in the bedroom and hallway. Tenant reports recurring condensation and a musty smell.',
    addressLine1: 'Flat 2, Riverside Court',
    addressLine2: '12 Riverside Drive',
    city: 'Manchester',
    postcode: 'M1 2AB',
    incidentDate: new Date('2025-11-18'),
    riskScore: 8,
    riskLevel: 'High',
    riskFactors: 'threats_violence,repeat_offender',
    monitoringRequired: true,
    monitoringStatus: 'Approved',
    tenancyRef: 'RC-F2-2023',
    branch: 'Manchester North',
    landlordName: 'omnia',
    tenants: [
                { tenantName: 'Pop Tenant', tenantEmail: 'tenant@pop.test', tenancyRef: 'RC-F2-2023', isPrimary: true },
                { tenantName: 'J. Tenant', tenantEmail: 'jtenant@example.com', tenancyRef: 'RC-F2-2023', isPrimary: false },
              ],
    incident: {
      category: 'Damp & Mould',
      severity: 'High',
      description: 'Black mould on walls in bedroom, condensation on windows every morning.',
      location: 'Flat 2, Riverside Court',
    },
    evidence: [
      { fileName: 'mould-bedroom.jpg', fileType: 'image/jpeg', fileSize: 248000, description: 'Photo of black mould in bedroom corner.' },
      { fileName: 'mould-window.jpg', fileType: 'image/jpeg', fileSize: 193000, description: 'Condensation and mould around window frame.' },
    ],
    communications: [
      { type: 'Email', direction: 'Inbound', summary: 'Tenant first reported damp issue', details: 'Tenant emailed photos of mould and requested urgent repair.' },
      { type: 'Phone Call', direction: 'Outbound', summary: 'Surveyor inspection scheduled', details: 'Agreed with tenant to carry out damp survey on Friday.' },
    ],
    letter: {
      letterType: 'first_warning',
      content: 'We are writing to you as a formal first warning regarding reports of anti-social behaviour (ASB) at or near the above property.',
      sentDate: new Date('2025-11-20'),
      sentMethod: 'Post',
      certificateOfPostingDate: new Date('2025-11-20'),
      tenantName: 'Pop Tenant',
    },
    external: {
      bodyType: 'Police',
      cadNumber: 'CAD-00123',
      referenceNumber: 'CRN-9F8E7D6C5B',
      officerName: 'PC Smith',
      forceName: 'Greater Manchester Police',
      dateReported: new Date('2025-11-18'),
      notes: 'Attended property, reported disturbance.',
    },
    witnesses: [{ name: 'Nadia Park', contactDetails: 'nadia.park@example.com', statement: 'Confirmed seeing damp patches on shared hallway wall.' }],
    actions: [
      { description: 'Arrange damp survey with contractor', status: 'In Progress' },
      { description: 'Fit extractor fan in bathroom', status: 'Pending' },
    ],
    audit: [{ action: 'Complaint created', details: 'Logged by tenant via phone.' }],
    timeline: [
      { action: 'Complaint registered', details: 'Reference CMP-2025-0001 created.' },
      { action: 'Monitoring approved', details: 'Active monitoring granted due to high risk score.' },
    ],
  },
  {
    reference: 'CMP-2025-0002',
    tenantName: 'Pop Tenant',
    tenantEmail: 'tenant@pop.test',
    tenantPhone: '01234567890',
    category: 'Noise Nuisance',
    severity: 'Medium',
    status: 'Open',
    description:
      'Repeated late-night noise coming from the flat above. Tenant has kept a log of incidents across the last two weeks.',
    addressLine1: 'Flat 1, Riverside Court',
    addressLine2: '12 Riverside Drive',
    city: 'Manchester',
    postcode: 'M1 2AB',
    incidentDate: new Date('2026-01-05'),
    riskScore: 5,
    riskLevel: 'Medium',
    monitoringRequired: false,
    tenancyRef: 'RC-F1-2023',
    incident: {
      category: 'Noise Nuisance',
      severity: 'Medium',
      description: 'Loud music and banging until after 1am on multiple nights.',
      location: 'Flat 1, Riverside Court',
    },
    evidence: [
      { fileName: 'noise-log.pdf', fileType: 'application/pdf', fileSize: 12000, description: 'Two-week noise incident log kept by tenant.' },
    ],
    communications: [
      { type: 'Email', direction: 'Inbound', summary: 'Noise complaint escalation', details: 'Tenant sent completed noise log and asked for action.' },
    ],
    letter: { letterType: 'Warning Letter', content: 'We write regarding reports of excessive noise from your property.' },
    witnesses: [{ name: 'Anonymous Neighbour', anonymous: true, statement: 'Confirmed hearing loud noise from the upper flat.' }],
    actions: [
      { description: 'Issue warning letter to neighbouring tenant', status: 'Pending' },
      { description: 'Review noise log with ASB officer', status: 'Pending' },
    ],
    audit: [{ action: 'Complaint created', details: 'Logged by tenant via phone.' }],
    timeline: [{ action: 'Complaint registered', details: 'Reference CMP-2025-0002 created.' }],
  },
  {
    reference: 'CMP-2025-0003',
    tenantName: 'Sarah Smith',
    tenantEmail: 'sarah@pop.test',
    tenantPhone: '01234567890',
    category: 'Heating & Hot Water',
    severity: 'Critical',
    status: 'Under Review',
    description:
      'No heating or hot water since the boiler broke down four days ago. Elderly resident in the property.',
    addressLine1: 'Unit B, Meadow View Flats',
    addressLine2: '48 Meadow Lane',
    city: 'Manchester',
    postcode: 'M4 3CD',
    incidentDate: new Date('2026-01-10'),
    riskScore: 10,
    riskLevel: 'Critical',
    riskFactors: 'threats_violence,vulnerable_tenant',
    monitoringRequired: true,
    monitoringStatus: 'Approved',
    tenancyRef: 'MV-UB-2024',
    branch: 'Meadow Valley',
    landlordName: 'redstone',
    noticeGround: '14',
    noticeServedDate: new Date('2026-01-12'),
    noticeExpiresDate: new Date('2026-01-12'),
    rentArrearsAmount: 850.0,
    closedReason: null,
    outcome: null,
    incident: {
      category: 'Heating & Hot Water',
      severity: 'Critical',
      description: 'Boiler not working, no heating or hot water for 4 days. Elderly resident.',
      location: 'Unit B, Meadow View Flats',
    },
    evidence: [
      { fileName: 'boiler-error.jpg', fileType: 'image/jpeg', fileSize: 156000, description: 'Boiler display showing error code E133.' },
      { fileName: 'engineer-report.pdf', fileType: 'application/pdf', fileSize: 9800, description: 'Emergency engineer report confirming boiler failure.' },
    ],
    communications: [
      { type: 'Phone Call', direction: 'Inbound', date: new Date('2026-01-10'), summary: 'Emergency heating call', details: 'Tenant reported complete loss of heating and hot water.' },
      { type: 'Email', direction: 'Outbound', date: new Date('2026-01-10'), summary: 'Boiler replacement authorised', details: 'Authorised emergency boiler replacement, 48hr turnaround.' },
    ],
    letter: {
      letterType: 'notice_seeking_possession',
      content: 'NOTICE SEEKING POSSESSION — Housing Act 1988 Section 8. Ground 14.',
      sentDate: new Date('2026-01-12'),
      sentMethod: 'Post',
      certificateOfPostingDate: new Date('2026-01-12'),
      letterhead: 'POP',
      tenantName: 'Pop Tenant',
    },
    external: {
      bodyType: 'Social Services',
      cadNumber: 'SS-2026-0012',
      officerName: 'Sally Jones',
      forceName: 'Manchester City Council Social Services',
      dateReported: new Date('2026-01-10'),
      notes: 'Welfare check requested for elderly resident.',
    },
    witnesses: [{ name: 'Sam Okafor', contactDetails: 'sam.okafor@example.com', statement: 'Engineer confirmed boiler beyond economical repair.' }],
    actions: [
      { description: 'Replace boiler (emergency works)', status: 'In Progress' },
      { description: 'Provide interim heating units', status: 'Completed' },
    ],
    audit: [{ action: 'Complaint created', details: 'Logged by tenant via phone.' }],
    timeline: [
      { action: 'Complaint registered', details: 'Reference CMP-2025-0003 created.' },
      { action: 'Emergency works authorised', details: 'Boiler replacement approved.' },
      { action: 'Notice Seeking Possession served', details: 'Section 8 Ground 14 notice served by post (PC2 01-12-2026).' },
    ],
  },
  {
    reference: 'CMP-2025-0004',
    tenantName: 'Sarah Smith',
    tenantEmail: 'sarah@pop.test',
    tenantPhone: '01234567890',
    category: 'Anti-Social Behaviour',
    severity: 'Low',
    status: 'Closed',
    description:
      'Complaint about litter and fly-tipping in the communal courtyard. Cleared and resolved with waste team.',
    addressLine1: 'Unit C, Meadow View Flats',
    addressLine2: '48 Meadow Lane',
    city: 'Manchester',
    postcode: 'M4 3CD',
    incidentDate: new Date('2025-10-02'),
    closedAt: new Date('2025-10-20'),
    riskScore: 3,
    riskLevel: 'Low',
    monitoringRequired: false,
    tenancyRef: 'MV-UC-2024',
    incident: {
      category: 'Anti-Social Behaviour',
      severity: 'Low',
      description: 'Fly-tipping of furniture in communal courtyard.',
      location: 'Meadow View Flats courtyard',
    },
    evidence: [
      { fileName: 'flytip.jpg', fileType: 'image/jpeg', fileSize: 121000, description: 'Photo of fly-tipped furniture in courtyard.' },
    ],
    communications: [
      { type: 'Email', direction: 'Outbound', summary: 'Waste team notified', details: 'Cleared fly-tipping and arranged bin rotation.' },
    ],
    letter: { letterType: 'Closing Letter', content: 'We are pleased to confirm your complaint has been resolved.' },
    witnesses: [],
    actions: [
      { description: 'Clear fly-tipped waste', status: 'Completed' },
      { description: 'Post ASB guidance in communal areas', status: 'Completed' },
    ],
    audit: [{ action: 'Complaint closed', details: 'Resolved and closed after confirmation from tenant.' }],
    timeline: [{ action: 'Complaint closed', details: 'Closed as resolved.' }],
  },
  {
    reference: 'CMP-2025-0005',
    tenantName: 'Pop Tenant',
    tenantEmail: 'tenant@pop.test',
    tenantPhone: '01234567890',
    category: 'Repairs',
    severity: 'Medium',
    status: 'Open',
    description:
      'Kitchen sink leak causing water damage to the cupboard below. Reported after previous repair did not hold.',
    addressLine1: 'Unit A, Meadow View Flats',
    addressLine2: '48 Meadow Lane',
    city: 'Manchester',
    postcode: 'M4 3CD',
    incidentDate: new Date('2026-01-15'),
    riskScore: 4,
    riskLevel: 'Medium',
    monitoringRequired: false,
    tenancyRef: 'MV-UA-2024',
    incident: {
      category: 'Repairs',
      severity: 'Medium',
      description: 'Leaking pipe under kitchen sink, water damage to cupboard.',
      location: 'Unit A, Meadow View Flats',
    },
    evidence: [
      { fileName: 'sink-leak.jpg', fileType: 'image/jpeg', fileSize: 178000, description: 'Water pooling under kitchen sink.' },
    ],
    communications: [
      { type: 'Email', direction: 'Inbound', summary: 'Recurring leak reported', details: 'Leak returned two weeks after previous fix.' },
    ],
    letter: { letterType: 'Notice of Works', content: 'A plumber will attend to repair the leaking pipe under your sink.' },
    witnesses: [],
    actions: [
      { description: 'Repair pipework and replace damaged cupboard', status: 'Pending' },
    ],
    audit: [{ action: 'Complaint created', details: 'Logged by tenant via phone.' }],
    timeline: [{ action: 'Complaint registered', details: 'Reference CMP-2025-0005 created.' }],
  },
];

async function ensureRole(name) {
  let role = await prisma.role.findUnique({ where: { name } });
  if (!role) {
    role = await prisma.role.create({ data: { name } });
    console.log('Created role:', name);
  }
  return role;
}

async function seedUsers(org) {
  for (const dummy of DUMMY_USERS) {
    const role = await ensureRole(dummy.role);
    let user = await prisma.person.findUnique({ where: { email: dummy.email } });
    if (!user) {
      const hash = await bcrypt.hash(dummy.password, 10);
      user = await prisma.person.create({
        data: {
          email: dummy.email,
          passwordHash: hash,
          firstName: dummy.firstName,
          lastName: dummy.lastName,
          phone: '01234567890',
          status: 'Active',
          orgId: org.id,
        },
      });
      console.log(`Created user: ${dummy.email}`);
    }
    const existingRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
    });
    if (!existingRole) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
      console.log(`Assigned role ${role.name} to ${dummy.email}`);
    }
  }
}

async function seedCompanies() {
  for (const c of DEMO_COMPANIES) {
    const existing = await prisma.housingCompany.findUnique({ where: { alias: c.alias } });
    if (!existing) {
      await prisma.housingCompany.create({ data: { alias: c.alias, fullName: c.fullName, address: c.address } });
      console.log(`Created housing company: ${c.fullName} (alias ${c.alias})`);
    }
  }
}

async function seedDemoData(org) {
  const admin = await prisma.person.findUnique({ where: { email: 'admin@pop.test' } });
  const manager = await prisma.person.findUnique({ where: { email: 'manager@pop.test' } });

  // Properties + units
  for (const p of DEMO_PROPERTIES) {
    let property = await prisma.property.findFirst({ where: { name: p.name, orgId: org.id } });
    if (!property) {
      property = await prisma.property.create({
        data: { name: p.name, address: p.address, type: p.type, status: p.status, orgId: org.id },
      });
      console.log('Created property:', p.name);
    }
    for (const unitName of p.units) {
      const existing = await prisma.unit.findFirst({ where: { name: unitName, propertyId: property.id } });
      if (!existing) {
        await prisma.unit.create({ data: { name: unitName, propertyId: property.id, tenantId: null } });
      }
    }
  }

  const propertyMap = {};
  for (const p of DEMO_PROPERTIES) {
    propertyMap[p.name] = await prisma.property.findFirst({ where: { name: p.name, orgId: org.id } });
  }

  // Complaints (idempotent: recreate each demo complaint cleanly)
  for (const demo of DEMO_COMPLAINTS) {
    const existing = await prisma.complaint.findUnique({ where: { reference: demo.reference } });
    if (existing) {
      await prisma.complaintIncident.deleteMany({ where: { complaintId: existing.id } });
      await prisma.complaintEvidence.deleteMany({ where: { complaintId: existing.id } });
      await prisma.complaintCommunication.deleteMany({ where: { complaintId: existing.id } });
      await prisma.complaintLetter.deleteMany({ where: { complaintId: existing.id } });
      await prisma.complaintWitness.deleteMany({ where: { complaintId: existing.id } });
      await prisma.complaintAction.deleteMany({ where: { complaintId: existing.id } });
      await prisma.complaintMonitoring.deleteMany({ where: { complaintId: existing.id } });
      await prisma.complaintAudit.deleteMany({ where: { complaintId: existing.id } });
      await prisma.timelineEvent.deleteMany({ where: { complaintId: existing.id } });
      await prisma.complaint.delete({ where: { id: existing.id } });
      console.log('Recreating demo complaint:', demo.reference);
    }

    const property = demo.addressLine1.includes('Riverside') ? propertyMap['Riverside Court'] : propertyMap['Meadow View Flats'];
    const complaint = await prisma.complaint.create({
      data: {
        reference: demo.reference,
        tenantName: demo.tenantName,
        tenantEmail: demo.tenantEmail,
        tenantPhone: demo.tenantPhone,
        propertyId: property.id,
        category: demo.category,
        severity: demo.severity,
        status: demo.status,
        description: demo.description,
        addressLine1: demo.addressLine1,
        addressLine2: demo.addressLine2,
        city: demo.city,
        postcode: demo.postcode,
        assignedToId: demo.status === 'Closed' ? null : manager.id,
        incidentDate: demo.incidentDate,
        closedAt: demo.closedAt ?? null,
        riskScore: demo.riskScore,
        riskLevel: demo.riskLevel,
        monitoringRequired: demo.monitoringRequired,
        monitoringStatus: demo.monitoringStatus,
         tenancyRef: demo.tenancyRef,
         branch: demo.branch || null,
         assignedPmEmail: demo.assignedPmEmail || null,
         propertyLevel: !!demo.propertyLevel,
         landlordName: demo.landlordName || null,
        riskFactors: demo.riskFactors || null,
        closedReason: demo.closedReason || null,
        outcome: demo.outcome || null,
        noticeGround: demo.noticeGround || null,
        noticeServedDate: demo.noticeServedDate ? new Date(demo.noticeServedDate) : null,
        noticeExpiresDate: demo.noticeExpiresDate ? new Date(demo.noticeExpiresDate) : null,
        rentArrearsAmount: demo.rentArrearsAmount ?? null,
        orgId: org.id,
         tenants: {
           create: (Array.isArray(demo.tenants) && demo.tenants.length
             ? demo.tenants
             : [{ tenantName: demo.tenantName, tenantEmail: demo.tenantEmail, tenancyRef: demo.tenancyRef || null, isPrimary: true }])
             .map((t) => ({
               tenantName: t.tenantName,
               tenantEmail: t.tenantEmail || null,
               tenantPhone: t.tenantPhone || null,
               tenancyRef: t.tenancyRef || null,
               isPrimary: t.isPrimary,
             })),
         },
        incidents: {
          create: [{ ...demo.incident, incidentDate: demo.incidentDate, loggedById: demo.status === 'Closed' ? admin.id : manager.id }],
        },
        evidence: {
          create: demo.evidence.map((e) => ({
            ...e,
            r2Key: `demo/${demo.reference.toLowerCase()}/${e.fileName}`,
            uploadedById: admin.id,
          })),
        },
        communications: {
          create: demo.communications.map((c) => ({ ...c, date: c.date ?? demo.incidentDate, userId: admin.id })),
        },
        letters: {
          create: demo.letter
            ? [
                {
                  letterType: demo.letter.letterType,
                  content: demo.letter.content,
                  letterhead: demo.letter.letterhead || 'POP',
                  generatedById: admin.id,
                  isGeneric: demo.letter.isGeneric || false,
                  tenantName: demo.letter.tenantName || null,
                  sentDate: demo.letter.sentDate ? new Date(demo.letter.sentDate) : (demo.status === 'Closed' ? demo.closedAt : null),
                  sentMethod: demo.letter.sentMethod || null,
                  certificateOfPostingDate: demo.letter.certificateOfPostingDate ? new Date(demo.letter.certificateOfPostingDate) : null,
                },
              ]
            : [],
        },
        ...(demo.external
          ? {
              external: {
                create: {
                  bodyType: demo.external.bodyType,
                  cadNumber: demo.external.cadNumber || null,
                  referenceNumber: demo.external.referenceNumber || null,
                  officerName: demo.external.officerName || null,
                  forceName: demo.external.forceName || null,
                  dateReported: demo.external.dateReported ? new Date(demo.external.dateReported) : null,
                  notes: demo.external.notes || null,
                  loggedById: admin.id,
                },
              },
            }
          : {}),
        witnesses: {
          create: demo.witnesses.map((w) => ({
            name: w.name,
            contactDetails: w.contactDetails ?? null,
            statement: w.statement ?? null,
            anonymous: w.anonymous ?? false,
            digitalAcknowledgement: false,
          })),
        },
        actions: {
          create: demo.actions.map((a) => ({
            description: a.description,
            status: a.status,
            ownerId: a.status === 'Completed' ? null : manager.id,
            createdById: admin.id,
            dueDate: a.status === 'Completed' ? null : new Date(Date.now() + 7 * 86400000),
            completedAt: a.status === 'Completed' ? (demo.closedAt ?? new Date()) : null,
          })),
        },
        auditLogs: {
          create: demo.audit.map((a) => ({ action: a.action, details: a.details, userId: admin.id })),
        },
        timelineEvents: {
          create: demo.timeline.map((t) => ({ action: t.action, details: t.details, personId: admin.id })),
        },
      },
      include: { actions: true, timelineEvents: true },
    });

    if (demo.monitoringRequired && demo.monitoringStatus === 'Approved') {
      await prisma.complaintMonitoring.create({
        data: {
          complaintId: complaint.id,
          status: 'Approved',
          justification: 'High risk score warrants active monitoring.',
          requestedById: admin.id,
          approvedById: manager.id,
          expiresAt: new Date(Date.now() + 30 * 86400000),
        },
      });
      console.log(`Monitoring granted for ${demo.reference}`);
    } else if (demo.monitoringRequired) {
      await prisma.complaintMonitoring.create({
        data: {
          complaintId: complaint.id,
          status: 'Requested',
          justification: 'Requested at time of logging.',
          requestedById: admin.id,
          approvedById: null,
          expiresAt: null,
        },
      });
    }

    console.log('Created complaint:', demo.reference, `(${demo.status})`);
  }
}

async function main() {
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'Default Org' } });
    console.log('Created org:', org.name);
  }

  await seedUsers(org);
  await seedCompanies();
  await seedDemoData(org);

  console.log('\n=== DUMMY LOGINS ===');
  console.log('Admin:          admin@pop.test   / Admin123!');
  console.log('PropertyManager: manager@pop.test / Manager123!');
  console.log('Tenant (A):     tenant@pop.test   / Tenant123!  (owns CMP-0001,0002,0005)');
  console.log('Tenant (B):     sarah@pop.test    / Sarah123!   (owns CMP-0003,0004)');
  console.log('===================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
