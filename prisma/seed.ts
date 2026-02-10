import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@canvastudio.local' },
    update: {},
    create: {
      email: 'admin@canvastudio.local',
      password: hashedPassword,
      displayName: 'Administrateur',
    },
  });

  // Default app config
  const configs = [
    { key: 'app_name', value: 'Canva Studio Pro', group: 'general' },
    { key: 'app_locale', value: 'fr', group: 'general' },
    { key: 'canva_api_base', value: 'https://api.canva.com/rest', group: 'canva' },
    { key: 'canva_auth_url', value: 'https://www.canva.com/api/oauth/authorize', group: 'canva' },
    { key: 'canva_token_url', value: 'https://api.canva.com/rest/v1/oauth/token', group: 'canva' },
    { key: 'default_design_width', value: '1920', group: 'design' },
    { key: 'default_design_height', value: '1080', group: 'design' },
    { key: 'max_upload_size_mb', value: '100', group: 'upload' },
    { key: 'allowed_file_types', value: 'image/png,image/jpeg,image/svg+xml,image/webp,video/mp4', group: 'upload' },
    { key: 'export_formats', value: 'pdf,jpg,png,gif,pptx,mp4', group: 'export' },
    { key: 'magento_enabled', value: 'false', group: 'magento' },
  ];

  for (const config of configs) {
    await prisma.appConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  // Create default folders
  const folders = ['Mes Designs', 'Templates', 'Assets', 'Exports'];
  for (const name of folders) {
    await prisma.folder.create({
      data: { name, userId: admin.id },
    });
  }

  console.log('Database seeded successfully');
  console.log(`Admin user: admin@canvastudio.local / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
