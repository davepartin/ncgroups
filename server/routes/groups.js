/**
 * Groups Routes
 * CRUD operations for ministry groups
 * 
 * GET    /api/groups         - List all groups with member counts
 * POST   /api/groups         - Create group
 * GET    /api/groups/:id     - Get single group with members
 * PUT    /api/groups/:id     - Update group
 * DELETE /api/groups/:id     - Delete group
 */

import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

/**
 * GET /api/groups
 * Returns all groups with member counts
 */
router.get('/', async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { sourceStatus: null },
          { sourceStatus: { not: 'archived' } }
        ]
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });

    // Transform to include memberCount
    const transformed = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      memberCount: group._count.members
    }));

    res.json({
      count: transformed.length,
      groups: transformed
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

/**
 * GET /api/groups/:id
 * Returns group with full member list
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                gender: true,
                ageGroup: true,
                isOptedOut: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Transform to flatten member data
    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      memberCount: group.members.length,
      members: group.members.map(m => m.person)
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

/**
 * POST /api/groups
 * Body: { name, description? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Check for duplicate name
    const existing = await prisma.group.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'A group with this name already exists' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        description: description || null
      }
    });

    res.status(201).json({
      ...group,
      memberCount: 0
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

/**
 * PUT /api/groups/:id
 * Body: { name?, description? }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if group exists
    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (existing.sourceManaged) {
      return res.status(409).json({ error: 'This group is managed by the NC Vault. Update it in Obsidian.' });
    }

    // Check for duplicate name if changing
    if (name && name !== existing.name) {
      const duplicate = await prisma.group.findUnique({ where: { name } });
      if (duplicate) {
        return res.status(400).json({ error: 'A group with this name already exists' });
      }
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description
      },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });

    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      memberCount: group._count.members
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

/**
 * DELETE /api/groups/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if group exists and get member count
    const existing = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (existing.sourceManaged) {
      return res.status(409).json({ error: 'Vault-managed groups cannot be deleted here. Archive the group in the NC Vault.' });
    }

    // Warn if group has members (but still allow delete)
    const hadMembers = existing._count.members;

    // Delete (cascade will remove memberships)
    await prisma.group.delete({ where: { id } });

    res.json({ 
      message: 'Group deleted successfully',
      membersRemoved: hadMembers
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

export default router;
