const bcrypt = require('bcryptjs');
const { COMMUNICATION_RULES } = require('../../config/constants');

const prisma = require('../../config/database');

// Role-based user creation permissions
const CREATION_RULES = {
  'ADMIN': {
    canCreate: ['SUPER_USER', 'TEAM_LEAD'],
    description: 'Admin can only create Super User and Team Lead'
  },
  'TEAM_LEAD': {
    canCreate: ['TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Team Lead can only create Team Managers and Team Members'
  },
  'SUPER_USER': {
    canCreate: [],
    description: 'Super User cannot create any users'
  },
  'TEAM_MANAGER': {
    canCreate: [],
    description: 'Team Manager cannot create any users'
  },
  'TEAM_MEMBER': {
    canCreate: [],
    description: 'Team Member cannot create any users'
  }
};

class UserService {
  async ensureLeadTeam(leadUser) {
    if (!leadUser || leadUser.role !== 'TEAM_LEAD') {
      throw new Error('Only team leads have teams');
    }

    if (leadUser.teamId) {
      const existing = await prisma.team.findUnique({ where: { id: leadUser.teamId } });
      if (existing) return existing;
    }

    const team = await prisma.team.create({
      data: {
        name: `${leadUser.name || leadUser.username}'s Team`,
        leadId: leadUser.id,
      },
    });

    await prisma.user.update({
      where: { id: leadUser.id },
      data: { teamId: team.id },
    });

    leadUser.teamId = team.id;
    return team;
  }

  async getChatContactsForLead(leadUser) {
    const team = await this.ensureLeadTeam(leadUser);

    return prisma.user.findMany({
      where: {
        AND: [
          { id: { not: leadUser.id } },
          {
            OR: [
              { role: 'SUPER_USER' },
              { role: 'TEAM_LEAD' },
              {
                teamId: team.id,
                role: { in: ['TEAM_MANAGER', 'TEAM_MEMBER'] },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        teamId: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });
  }

  async getUsers(filters = {}, requester = null) {
    try {
      const { role, teamId, context } = filters;

      if (requester?.role === 'TEAM_LEAD' && context !== 'team') {
        let users = await this.getChatContactsForLead(requester);
        if (role) users = users.filter((u) => u.role === role);
        return users;
      }

      const where = {};

      if (requester?.role === 'TEAM_LEAD' && context === 'team') {
        const team = await this.ensureLeadTeam(requester);
        where.teamId = team.id;
        where.role = { in: ['TEAM_MANAGER', 'TEAM_MEMBER'] };
      } else if (teamId) {
        where.teamId = teamId;
        if (role) where.role = role;
      } else if (role) {
        where.role = role;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          teamId: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
        },
      });

      return users;
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw error;
    }
  }
  
  async getUserById(id) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          teamId: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true
        }
      });
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }
  
  async createUser(userData, creator) {
    try {
      const { username, password, name, role, teamId } = userData;

      const allowedRoles = CREATION_RULES[creator.role]?.canCreate || [];
      if (!allowedRoles.includes(role)) {
        throw new Error(`You don't have permission to create a ${role}`);
      }

      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      const hashedPassword = await bcrypt.hash(password || 'default123', 10);

      let assignedTeamId = teamId || null;

      if (creator.role === 'TEAM_LEAD') {
        const team = await this.ensureLeadTeam(creator);
        assignedTeamId = team.id;
      }

      const created = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          role,
          teamId: assignedTeamId,
        },
      });

      if (creator.role === 'ADMIN' && role === 'TEAM_LEAD') {
        await this.ensureLeadTeam(created);
        return prisma.user.findUnique({
          where: { id: created.id },
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            teamId: true,
            isOnline: true,
            lastSeen: true,
            createdAt: true,
          },
        });
      }

      return created;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }
  
  async updateUser(id, userData) {
    try {
      return await prisma.user.update({
        where: { id },
        data: userData
      });
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  async updateOwnProfile(userId, profileData) {
    const { name, username, currentPassword, newPassword } = profileData;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const data = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        throw new Error('Name is required');
      }
      data.name = trimmed;
    }

    if (username !== undefined) {
      const trimmed = String(username).trim();
      if (!trimmed) {
        throw new Error('Username is required');
      }
      if (trimmed !== user.username) {
        const existing = await prisma.user.findUnique({ where: { username: trimmed } });
        if (existing) {
          throw new Error('Username already taken');
        }
        data.username = trimmed;
      }
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (!currentPassword) {
        throw new Error('Current password is required to set a new password');
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        throw new Error('Current password is incorrect');
      }
      if (String(newPassword).length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      throw new Error('No changes to save');
    }

    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        teamId: true,
      },
    });
  }
  
  async deleteUser(id, requester = null) {
    try {
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) {
        throw new Error('User not found');
      }

      if (requester?.role === 'TEAM_LEAD') {
        const team = await this.ensureLeadTeam(requester);
        if (target.teamId !== team.id) {
          throw new Error('You can only remove users from your own team');
        }
        if (!['TEAM_MEMBER', 'TEAM_MANAGER'].includes(target.role)) {
          throw new Error('You can only remove team members or managers');
        }
      }

      await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: id },
            { receiverId: id }
          ]
        }
      });
      
      // Delete files
      await prisma.file.deleteMany({
        where: {
          OR: [
            { senderId: id },
            { receiverId: id }
          ]
        }
      });
      
      // Delete user
      return await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw new Error('Cannot delete user. Please try again.');
    }
  }
  
  async getUsersByRole(role) {
    try {
      return await prisma.user.findMany({
        where: { role },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isOnline: true,
          lastSeen: true
        }
      });
    } catch (error) {
      console.error('Error in getUsersByRole:', error);
      throw error;
    }
  }
  
  async getTeamMembers(teamId) {
    try {
      return await prisma.user.findMany({
        where: { teamId },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isOnline: true,
          lastSeen: true
        }
      });
    } catch (error) {
      console.error('Error in getTeamMembers:', error);
      throw error;
    }
  }
  
  canCommunicate(senderRole, receiverRole) {
    const allowed = COMMUNICATION_RULES[senderRole]?.canCommunicateWith || [];
    return allowed.includes(receiverRole);
  }
  
  getCreationRules(role) {
    return CREATION_RULES[role] || { canCreate: [], description: 'No permissions' };
  }

  // NEW: Reset user password
  async resetPassword(userId, newPassword) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      return await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
