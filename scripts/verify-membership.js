
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
    console.log('🔍 Verifying Membership Status...');

    // Check counts by status
    const counts = await prisma.person.groupBy({
        by: ['membershipStatus'],
        _count: true
    });

    console.log('📊 Counts by Status:');
    console.table(counts);

    // Sample check
    const sample = await prisma.person.findMany({
        take: 5,
        where: { membershipStatus: { not: null } },
        select: { firstName: true, lastName: true, membershipStatus: true }
    });

    console.log('📝 Sample People:');
    console.table(sample);
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
