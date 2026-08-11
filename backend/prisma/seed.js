const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DUMMY_USERS = [
  { email: 'admin@pop.test', password: 'Admin123!', firstName: 'Pop', lastName: 'Admin', role: 'Admin' },
  { email: 'manager@pop.test', password: 'Manager123!', firstName: 'Pop', lastName: 'Manager', role: 'PropertyManager' },
  { email: 'tenant@pop.test', password: 'Tenant123!', firstName: 'Pop', lastName: 'Tenant', role: 'Tenant' },
];

async function main() {
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'Default Org' } });
    console.log('Created org:', org.name);
  }

  const ensureRole = async (name) => {
    let role = await prisma.role.findUnique({ where: { name } });
    if (!role) {
      role = await prisma.role.create({ data: { name } });
      console.log('Created role:', name);
    }
    return role;
  };

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

  console.log('\n=== DUMMY LOGINS ===');
  console.log('Admin:          admin@pop.test   / Admin123!');
  console.log('PropertyManager: manager@pop.test / Manager123!');
  console.log('Tenant:         tenant@pop.test   / Tenant123!');
  console.log('===================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
