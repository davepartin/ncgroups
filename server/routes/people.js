/**
 * People Routes
 * Full CRUD operations with filtering support
 * 
 * GET    /api/people         - List all with filters
 * POST   /api/people         - Create person
 * GET    /api/people/:id     - Get single person
 * PUT    /api/people/:id     - Update person
 * DELETE /api/people/:id     - Delete person
 */

import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/**
 * GET /api/people
 * Query params:
 *   - search: Search firstName and lastName
 *   - group: Filter by group ID
 *   - gender: Filter by gender (Male, Female)
 *   - ageGroup: Filter by age group (Adult, Youth, Child)
 *   - gender: Filter by gender (Male, Female)
 *   - ageGroup: Filter by age group (Adult, Youth, Child)
 *   - membershipStatus: Filter by membership status
 *   - hasPhone: Filter to only people with phone numbers (true/false)
 *   - optedOut: Include opted-out people (true/false, default false)
 *   - sort: Sort field (lastName, firstName, createdAt)
 *   - order: Sort order (asc, desc)
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      group,
      gender,
      group,
      gender,
      ageGroup,
      membershipStatus,
      hasPhone,
      optedOut = 'false',
      sort = 'lastName',
      order = 'asc'
    } = req.query;

    // Build where clause
    const where = {};

    // Search by name
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filter by group
    if (group) {
      where.groups = {
        some: {
          groupId: group
        }
      };
    }

    // Filter by gender
    if (gender) {
      where.gender = gender;
    }

    // Filter by age group
    if (ageGroup) {
      where.ageGroup = ageGroup;
    }

    // Filter by membership status
    if (membershipStatus) {
      where.membershipStatus = membershipStatus;
    }

    // Filter by has phone
    if (hasPhone === 'true') {
      where.phone = { not: null };
    }

    // Filter opted out (exclude by default)
    if (optedOut !== 'true') {
      where.isOptedOut = false;
    }

    // Build orderBy
    const validSortFields = ['lastName', 'firstName', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sort) ? sort : 'lastName';
    const sortOrder = order === 'desc' ? 'desc' : 'asc';

    const people = await prisma.person.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      include: {
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Transform to flatten group data
    const transformed = people.map(person => ({
      ...person,
      groups: person.groups.map(pg => pg.group)
    }));

    res.json({
      count: transformed.length,
      people: transformed
    });
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

/**
 * GET /api/people/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Flatten groups
    res.json({
      ...person,
      groups: person.groups.map(pg => pg.group)
    });
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

/**
 * POST /api/people
 * Body: { firstName, lastName, phone?, email?, gender?, ageGroup?, groupIds?: string[] }
 */
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, gender, ageGroup, membershipStatus, groupIds = [] } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Clean phone number
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(0, 10) : null;
    const validPhone = cleanPhone && cleanPhone.length === 10 ? cleanPhone : null;

    const person = await prisma.person.create({
      data: {
        firstName,
        lastName,
        phone: validPhone,
        email: email || null,
        gender: gender || null,
        email: email || null,
        gender: gender || null,
        ageGroup: ageGroup || null,
        membershipStatus: membershipStatus || null,
        groups: {
          create: groupIds.map(groupId => ({
            group: { connect: { id: groupId } }
          }))
        }
      },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });

    res.status(201).json({
      ...person,
      groups: person.groups.map(pg => pg.group)
    });
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

/**
 * PUT /api/people/:id
 * Body: { firstName?, lastName?, phone?, email?, gender?, ageGroup?, isOptedOut?, groupIds?: string[] }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email, gender, ageGroup, membershipStatus, isOptedOut, groupIds } = req.body;

    // Check if person exists
    const existing = await prisma.person.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Build update data
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (ageGroup !== undefined) updateData.ageGroup = ageGroup || null;
    if (membershipStatus !== undefined) updateData.membershipStatus = membershipStatus || null;
    if (isOptedOut !== undefined) updateData.isOptedOut = isOptedOut;

    // Handle phone cleaning
    if (phone !== undefined) {
      const cleanPhone = phone ? phone.replace(/\D/g, '').slice(0, 10) : null;
      updateData.phone = cleanPhone && cleanPhone.length === 10 ? cleanPhone : null;
    }

    // Update person
    const person = await prisma.person.update({
      where: { id },
      data: updateData
    });

    // Update group memberships if provided
    if (groupIds !== undefined) {
      // Remove all existing memberships
      await prisma.personGroup.deleteMany({
        where: { personId: id }
      });

      // Add new memberships
      if (groupIds.length > 0) {
        await prisma.personGroup.createMany({
          data: groupIds.map(groupId => ({
            personId: id,
            groupId
          }))
        });
      }
    }

    // Fetch updated person with groups
    const updatedPerson = await prisma.person.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });

    res.json({
      ...updatedPerson,
      groups: updatedPerson.groups.map(pg => pg.group)
    });
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

/**
 * DELETE /api/people/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if person exists
    const existing = await prisma.person.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Delete (cascade will remove group memberships)
    await prisma.person.delete({ where: { id } });

    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

export default router;
