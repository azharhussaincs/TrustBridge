// User Roles
const ROLES = {
  ADMIN: 'admin',
  SUPER_USER: 'super-user',
  TEAM_LEAD: 'team-lead',
  TEAM_MANAGER: 'team-manager',
  TEAM_MEMBER: 'team-member'
};

// Role Hierarchy (for permission checking)
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 5,
  [ROLES.SUPER_USER]: 4,
  [ROLES.TEAM_LEAD]: 3,
  [ROLES.TEAM_MANAGER]: 2,
  [ROLES.TEAM_MEMBER]: 1
};

// Communication Permissions
const COMMUNICATION_RULES = {
  [ROLES.SUPER_USER]: {
    canCommunicateWith: [ROLES.TEAM_LEAD, ROLES.TEAM_MANAGER],
    canAddUsers: false,
    hasAdminPanel: false
  },
  [ROLES.ADMIN]: {
    canCommunicateWith: [ROLES.ADMIN, ROLES.SUPER_USER, ROLES.TEAM_LEAD, ROLES.TEAM_MANAGER, ROLES.TEAM_MEMBER],
    canAddUsers: [ROLES.SUPER_USER, ROLES.TEAM_LEAD],
    hasAdminPanel: true
  },
  [ROLES.TEAM_LEAD]: {
    canCommunicateWith: [ROLES.TEAM_LEAD, ROLES.TEAM_MANAGER, ROLES.TEAM_MEMBER],
    canAddUsers: [ROLES.TEAM_MANAGER, ROLES.TEAM_MEMBER],
    hasAdminPanel: false
  },
  [ROLES.TEAM_MANAGER]: {
    canCommunicateWith: [ROLES.TEAM_LEAD, ROLES.TEAM_MEMBER],
    canAddUsers: [ROLES.TEAM_MEMBER],
    hasAdminPanel: false
  },
  [ROLES.TEAM_MEMBER]: {
    canCommunicateWith: [ROLES.TEAM_MANAGER],
    canAddUsers: [],
    hasAdminPanel: false
  }
};

// Encryption Constants
const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  COMMUNICATION_RULES,
  ENCRYPTION
};
