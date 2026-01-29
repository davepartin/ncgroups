import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    try {
        // Find a specific person
        const person = await prisma.person.findFirst({
            where: { firstName: 'Andrea' }
        });

        if (person) {
            console.log('Before update:', person.membershipStatus);

            // Update to RegularAttender
            await prisma.person.update({
                where: { id: person.id },
                data: { membershipStatus: 'RegularAttender' }
            });

            // Fetch again
            const updated = await prisma.person.findUnique({
                where: { id: person.id }
            });

            console.log('After update:', updated.membershipStatus);
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
