function canManageGroups(user) {
  return user?.role === 'TEAM_LEAD' || user?.role === 'SUPER_USER';
}

function canAddUserToGroup(actor, target, group) {
  if (!actor || !target || !group) return false;

  if (actor.role === 'SUPER_USER') {
    return ['TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'].includes(target.role);
  }

  if (actor.role === 'TEAM_LEAD') {
    if (group.teamId && actor.teamId && group.teamId !== actor.teamId) {
      return false;
    }
    if (target.id === actor.id) return true;
    return (
      target.teamId === actor.teamId &&
      ['TEAM_MANAGER', 'TEAM_MEMBER'].includes(target.role)
    );
  }

  return false;
}

function canRemoveUserFromGroup(actor, target, group) {
  if (!canManageGroups(actor)) return false;
  if (target.id === group.createdById && actor.id !== target.id) {
    return actor.role === 'SUPER_USER';
  }
  return canAddUserToGroup(actor, target, group) || target.id === actor.id;
}

module.exports = {
  canManageGroups,
  canAddUserToGroup,
  canRemoveUserFromGroup,
};
