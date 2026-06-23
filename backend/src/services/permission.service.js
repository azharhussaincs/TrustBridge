const { COMMUNICATION_RULES } = require('../config/constants');

function canUsersChat(sender, receiver) {
  if (!sender || !receiver) return false;
  if (sender.id === receiver.id) return false;
  if (sender.role === 'ADMIN') return false;

  const allowed = COMMUNICATION_RULES[sender.role]?.canCommunicateWith || [];
  if (!allowed.includes(receiver.role)) return false;

  if (sender.role === 'TEAM_MEMBER') {
    if (receiver.role === 'SUPER_USER') return true;
    if (['TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'].includes(receiver.role)) {
      return Boolean(sender.teamId && sender.teamId === receiver.teamId);
    }
    return false;
  }

  if (sender.role === 'TEAM_MANAGER') {
    if (receiver.role === 'SUPER_USER') return true;
    if (receiver.role === 'TEAM_LEAD') {
      return Boolean(sender.teamId && sender.teamId === receiver.teamId);
    }
    if (receiver.role === 'TEAM_MANAGER') return true;
    if (receiver.role === 'TEAM_MEMBER') {
      return Boolean(sender.teamId && sender.teamId === receiver.teamId);
    }
    return false;
  }

  if (sender.role === 'TEAM_LEAD') {
    if (receiver.role === 'SUPER_USER' || receiver.role === 'TEAM_LEAD') return true;
    if (receiver.role === 'TEAM_MANAGER' || receiver.role === 'TEAM_MEMBER') {
      return Boolean(sender.teamId && sender.teamId === receiver.teamId);
    }
    return false;
  }

  if (sender.role === 'SUPER_USER') {
    return receiver.role === 'TEAM_LEAD' || receiver.role === 'TEAM_MANAGER';
  }

  return true;
}

module.exports = { canUsersChat };
