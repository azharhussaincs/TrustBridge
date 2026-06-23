const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const users = [
    { username: 'admin', name: 'Admin User', role: 'ADMIN' },
    { username: 'superuser', name: 'Super User', role: 'SUPER_USER' },
    { username: 'teamlead', name: 'Team Lead User', role: 'TEAM_LEAD' },
    { username: 'teammanager', name: 'Team Manager User', role: 'TEAM_MANAGER' },
    { username: 'teammember', name: 'Team Member User', role: 'TEAM_MEMBER' },
  ];

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        password: hashedPassword,
        name: user.name,
        role: user.role
      }
    });
    console.log(`✅ ${user.role} created:`, created.username);
  }
  
  console.log('🎉 Seeding complete!');
  console.log('📝 You can login with any of these (password: admin123):');
  users.forEach((u) => console.log(`   ${u.role}: ${u.username}`));
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
