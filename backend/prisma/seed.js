const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin created:', admin.email);
  
  // Create Super User
  const superUser = await prisma.user.upsert({
    where: { email: 'superuser@company.com' },
    update: {},
    create: {
      email: 'superuser@company.com',
      password: hashedPassword,
      name: 'Super User',
      role: 'SUPER_USER'
    }
  });
  console.log('✅ Super User created:', superUser.email);
  
  // Create Team Lead
  const teamLead = await prisma.user.upsert({
    where: { email: 'teamlead@company.com' },
    update: {},
    create: {
      email: 'teamlead@company.com',
      password: hashedPassword,
      name: 'Team Lead User',
      role: 'TEAM_LEAD'
    }
  });
  console.log('✅ Team Lead created:', teamLead.email);
  
  // Create Team Manager
  const teamManager = await prisma.user.upsert({
    where: { email: 'teammanager@company.com' },
    update: {},
    create: {
      email: 'teammanager@company.com',
      password: hashedPassword,
      name: 'Team Manager User',
      role: 'TEAM_MANAGER'
    }
  });
  console.log('✅ Team Manager created:', teamManager.email);
  
  // Create Team Member
  const teamMember = await prisma.user.upsert({
    where: { email: 'teammember@company.com' },
    update: {},
    create: {
      email: 'teammember@company.com',
      password: hashedPassword,
      name: 'Team Member User',
      role: 'TEAM_MEMBER'
    }
  });
  console.log('✅ Team Member created:', teamMember.email);
  
  console.log('🎉 Seeding complete!');
  console.log('📝 You can login with any of these:');
  console.log('   Admin: admin@company.com / admin123');
  console.log('   Super User: superuser@company.com / admin123');
  console.log('   Team Lead: teamlead@company.com / admin123');
  console.log('   Team Manager: teammanager@company.com / admin123');
  console.log('   Team Member: teammember@company.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
