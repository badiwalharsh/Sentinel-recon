const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for SentinelRecon...');

  const adminHash = await bcrypt.hash('Admin@Sentinel2026!', 12);
  const analystHash = await bcrypt.hash('Analyst@Sentinel2026!', 12);
  const auditorHash = await bcrypt.hash('Auditor@Sentinel2026!', 12);

  // 1. Seed Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sentinelrecon.local' },
    update: {},
    create: {
      email: 'admin@sentinelrecon.local',
      name: 'Sarah Connor (Security Admin)',
      passwordHash: adminHash,
      systemRole: 'ADMIN',
      isActive: true,
      twoFactorEnabled: true,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@sentinelrecon.local' },
    update: {},
    create: {
      email: 'analyst@sentinelrecon.local',
      name: 'Marcus Vance (Lead Analyst)',
      passwordHash: analystHash,
      systemRole: 'ANALYST',
      isActive: true,
      twoFactorEnabled: false,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@sentinelrecon.local' },
    update: {},
    create: {
      email: 'auditor@sentinelrecon.local',
      name: 'Elena Rostova (Compliance Auditor)',
      passwordHash: auditorHash,
      systemRole: 'AUDITOR',
      isActive: true,
      twoFactorEnabled: false,
    },
  });

  console.log(`✅ Seeded users: ${admin.email}, ${analyst.email}, ${auditor.email}`);

  // 2. Seed Sample Program
  const program = await prisma.program.upsert({
    where: { slug: 'apex-financial' },
    update: {},
    create: {
      name: 'Apex Financial Threat Surface Assessment',
      slug: 'apex-financial',
      description: 'Comprehensive external perimeter reconnaissance and attack surface mapping for Apex Financial Core Infrastructure.',
      scopeRules: 'IN SCOPE: *.apexfin.internal, *.apex-vault.io, AS65421 IP range 198.51.100.0/24.\nOUT OF SCOPE: Third-party payment gateways, employee personal devices, physical facilities.',
      createdById: admin.id,
      memberships: {
        create: [
          { userId: admin.id, role: 'LEAD_ANALYST' },
          { userId: analyst.id, role: 'ANALYST' },
          { userId: auditor.id, role: 'AUDITOR' },
        ],
      },
      targets: {
        create: [
          {
            name: 'Apex Core Gateway',
            primaryDomain: 'apex-vault.io',
            description: 'Customer facing authentication gateway and API clusters',
            authorizationConfirmed: true,
          },
          {
            name: 'Apex Internal Corporate',
            primaryDomain: 'apexfin.internal',
            description: 'Corporate DNS and employee portal endpoints',
            authorizationConfirmed: true,
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded program: ${program.name}`);

  // 3. Seed Initial Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'PROGRAM_CREATE',
      entityType: 'Program',
      entityId: program.id,
      programId: program.id,
      userId: admin.id,
      ipAddress: '127.0.0.1',
      userAgent: 'SentinelRecon-SeedEngine/1.0',
      details: { programName: program.name, scopeDefined: true },
    },
  });

  console.log('🏁 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
