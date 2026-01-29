
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const count = await prisma.person.count();
        console.log(`People count: ${count}`);

        // Check one Youth Parent
        const yp = await prisma.person.findFirst({
            where: {
                groups: {
                    some: {
                        group: { name: 'Youth Parents' }
                    }
                }
            },
            select: {
                firstName: true,
                lastName: true,
                membershipStatus: true
            }
        });

        if (yp) {
            console.log(`Sample Youth Parent: ${yp.firstName} ${yp.lastName}, Status: ${yp.membershipStatus}`);
        } else {
            console.log('No Youth Parents found yet.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
