const {
  canManageGroups,
  canAddUserToGroup,
  canRemoveUserFromGroup,
} = require('./group.permissions');
const userService = require('../user/user.service');

const prisma = require('../../config/database');

const userSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  teamId: true,
  isOnline: true,
};

class GroupService {
  async ensureMember(groupId, userId) {
    const membership = await prisma.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new Error('You are not a member of this group');
    }
  }

  async getGroupsForUser(userId) {
    const memberships = await prisma.chatGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      createdById: m.group.createdById,
      teamId: m.group.teamId,
      createdAt: m.group.createdAt,
      memberCount: m.group.members.length,
    }));
  }

  async getEligibleMembers(actor) {
    if (!canManageGroups(actor)) {
      throw new Error('You do not have permission to manage groups');
    }

    if (actor.role === 'SUPER_USER') {
      return prisma.user.findMany({
        where: {
          role: { in: ['TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'] },
          id: { not: actor.id },
        },
        select: userSelect,
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      });
    }

    if (actor.role === 'TEAM_LEAD') {
      const team = await userService.ensureLeadTeam(actor);
      actor.teamId = team.id;
      return prisma.user.findMany({
        where: {
          teamId: actor.teamId,
          role: { in: ['TEAM_MANAGER', 'TEAM_MEMBER'] },
        },
        select: userSelect,
        orderBy: { name: 'asc' },
      });
    }

    return [];
  }

  async getGroupDetails(groupId, userId) {
    await this.ensureMember(groupId, userId);

    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const userIds = group.members.map((m) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: userSelect,
    });

    return {
      id: group.id,
      name: group.name,
      createdById: group.createdById,
      teamId: group.teamId,
      createdAt: group.createdAt,
      members: users,
    };
  }

  async createGroup(actor, { name, memberIds = [] }) {
    if (!canManageGroups(actor)) {
      throw new Error('You do not have permission to create groups');
    }

    let teamId = null;
    if (actor.role === 'TEAM_LEAD') {
      const team = await userService.ensureLeadTeam(actor);
      teamId = team.id;
      actor.teamId = team.id;
    }

    const trimmed = String(name || '').trim();
    if (!trimmed) {
      throw new Error('Group name is required');
    }

    const uniqueMemberIds = [...new Set(memberIds.filter((id) => id && id !== actor.id))];

    const group = await prisma.chatGroup.create({
      data: {
        name: trimmed,
        createdById: actor.id,
        teamId: actor.role === 'TEAM_LEAD' ? teamId : null,
        members: {
          create: [{ userId: actor.id }],
        },
      },
    });

    for (const memberId of uniqueMemberIds) {
      await this.addMember(actor, group.id, memberId);
    }

    return this.getGroupDetails(group.id, actor.id);
  }

  async addMember(actor, groupId, memberId) {
    if (!canManageGroups(actor)) {
      throw new Error('You do not have permission to add members');
    }

    const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new Error('Group not found');
    }

    const target = await prisma.user.findUnique({ where: { id: memberId } });
    if (!target) {
      throw new Error('User not found');
    }

    if (!canAddUserToGroup(actor, target, group)) {
      throw new Error('You cannot add this user to the group');
    }

    const existing = await prisma.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: memberId } },
    });
    if (existing) {
      throw new Error('User is already in the group');
    }

    await prisma.chatGroupMember.create({
      data: { groupId, userId: memberId },
    });

    return this.getGroupDetails(groupId, actor.id);
  }

  async removeMember(actor, groupId, memberId) {
    if (!canManageGroups(actor)) {
      throw new Error('You do not have permission to remove members');
    }

    const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new Error('Group not found');
    }

    const target = await prisma.user.findUnique({ where: { id: memberId } });
    if (!target) {
      throw new Error('User not found');
    }

    if (!canRemoveUserFromGroup(actor, target, group)) {
      throw new Error('You cannot remove this user from the group');
    }

    const members = await prisma.chatGroupMember.findMany({ where: { groupId } });
    if (members.length <= 1) {
      throw new Error('Group must have at least one member');
    }

    await prisma.chatGroupMember.delete({
      where: { groupId_userId: { groupId, userId: memberId } },
    });

    return this.getGroupDetails(groupId, actor.id);
  }

  async deleteGroup(actor, groupId) {
    const group = await prisma.chatGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new Error('Group not found');
    }

    if (!canManageGroups(actor) || group.createdById !== actor.id) {
      throw new Error('Only the group creator can delete this group');
    }

    await prisma.chatGroup.delete({ where: { id: groupId } });
    return { id: groupId };
  }

  async getMessages(groupId, userId, limit = 50) {
    await this.ensureMember(groupId, userId);

    const messages = await prisma.groupMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    if (!messages.length) return [];

    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, username: true, role: true },
    });
    const senderById = Object.fromEntries(senders.map((s) => [s.id, s]));

    return messages.map((message) => ({
      ...message,
      sender: senderById[message.senderId] || null,
    }));
  }

  async createMessage(groupId, senderId, content, fileId = null) {
    await this.ensureMember(groupId, senderId);

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        senderId,
        content,
        fileId: fileId || null,
      },
    });

    const [sender, group] = await Promise.all([
      prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, name: true, username: true, role: true },
      }),
      prisma.chatGroup.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
    ]);

    return {
      ...message,
      sender,
      groupName: group?.name || 'Group',
    };
  }

  async getUserGroupIds(userId) {
    const memberships = await prisma.chatGroupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    return memberships.map((m) => m.groupId);
  }

  async getRecentMessagesForUser(userId, limit = 40) {
    const groupIds = await this.getUserGroupIds(userId);
    if (!groupIds.length) return [];

    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId: { in: groupIds },
        senderId: { not: userId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (!messages.length) return [];

    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const [senders, groups] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true, username: true, role: true },
      }),
      prisma.chatGroup.findMany({
        where: { id: { in: groupIds } },
        select: { id: true, name: true },
      }),
    ]);

    const senderById = Object.fromEntries(senders.map((s) => [s.id, s]));
    const groupById = Object.fromEntries(groups.map((g) => [g.id, g]));

    return messages.map((message) => ({
      ...message,
      sender: senderById[message.senderId] || null,
      groupName: groupById[message.groupId]?.name || 'Group',
    }));
  }
}

module.exports = new GroupService();
