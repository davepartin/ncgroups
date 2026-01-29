import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    try {
        // Get a person with membership status
        const person = await prisma.person.findFirst({
            where: {
                membershipStatus: { not: null }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                membershipStatus: true
            }
        });

        console.log('Person with status:', person);

        if (person) {
            // Try updating it
            const updated = await prisma.person.update({
                where: { id: person.id },
                data: { membershipStatus: 'Member' },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    membershipStatus: true
                }
            });

            console.log('After update:', updated);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
