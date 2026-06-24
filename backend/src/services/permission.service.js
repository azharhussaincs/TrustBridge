const { COMMUNICATION_RULES } = require('../config/constants');

/** Users without a team assignment share the same implicit team (matches frontend null/undefined teamId checks). */
function sameTeam(teamA, teamB) {
  if (!teamA && !teamB) return true;
  return Boolean(teamA && teamB && teamA === teamB);
}

function canUsersChat(sender, receiver) {
  if (!sender || !receiver) return false;
  if (sender.id === receiver.id) return false;
  if (sender.role === 'ADMIN') return false;

  const allowed = COMMUNICATION_RULES[sender.role]?.canCommunicateWith || [];
  if (!allowed.includes(receiver.role)) return false;

  if (sender.role === 'TEAM_MEMBER') {
    if (receiver.role === 'SUPER_USER') return true;
    if (['TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'].includes(receiver.role)) {
      return sameTeam(sender.teamId, receiver.teamId);
    }
    return false;
  }

  if (sender.role === 'TEAM_MANAGER') {
    if (receiver.role === 'SUPER_USER') return true;
    if (receiver.role === 'TEAM_LEAD') {
      return sameTeam(sender.teamId, receiver.teamId);
    }
    if (receiver.role === 'TEAM_MANAGER') return true;
    if (receiver.role === 'TEAM_MEMBER') {
      return sameTeam(sender.teamId, receiver.teamId);
    }
    return false;
  }

  if (sender.role === 'TEAM_LEAD') {
    if (receiver.role === 'SUPER_USER' || receiver.role === 'TEAM_LEAD') return true;
    if (receiver.role === 'TEAM_MANAGER' || receiver.role === 'TEAM_MEMBER') {
      return sameTeam(sender.teamId, receiver.teamId);
    }
    return false;
  }

  if (sender.role === 'SUPER_USER') {
    return receiver.role === 'TEAM_LEAD' || receiver.role === 'TEAM_MANAGER' || receiver.role === 'TEAM_MEMBER';
  }

  return true;
}

module.exports = { canUsersChat };
