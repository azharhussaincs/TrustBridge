// User Roles (UPPER_SNAKE — matches Prisma User.role)
const ROLES = {
  ADMIN: 'ADMIN',
  SUPER_USER: 'SUPER_USER',
  TEAM_LEAD: 'TEAM_LEAD',
  TEAM_MANAGER: 'TEAM_MANAGER',
  TEAM_MEMBER: 'TEAM_MEMBER'
};

// Role Hierarchy (for permission checking)
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 5,
  [ROLES.SUPER_USER]: 4,
  [ROLES.TEAM_LEAD]: 3,
  [ROLES.TEAM_MANAGER]: 2,
  [ROLES.TEAM_MEMBER]: 1
};

// CHAT Communication Permissions (who can chat with whom)
const COMMUNICATION_RULES = {
  [ROLES.SUPER_USER]: {
    canCommunicateWith: [ROLES.TEAM_LEAD, ROLES.TEAM_MANAGER, ROLES.TEAM_MEMBER],
    hasAdminPanel: false
  },
  [ROLES.ADMIN]: {
    canCommunicateWith: [],
    hasAdminPanel: true
  },
  [ROLES.TEAM_LEAD]: {
    canCommunicateWith: [ROLES.SUPER_USER, ROLES.TEAM_LEAD, ROLES.TEAM_MANAGER, ROLES.TEAM_MEMBER],
    hasAdminPanel: false
  },
  [ROLES.TEAM_MANAGER]: {
    canCommunicateWith: [ROLES.SUPER_USER, ROLES.TEAM_LEAD, ROLES.TEAM_MANAGER, ROLES.TEAM_MEMBER],
    hasAdminPanel: false
  },
  [ROLES.TEAM_MEMBER]: {
    canCommunicateWith: [ROLES.SUPER_USER, ROLES.TEAM_LEAD, ROLES.TEAM_MANAGER, ROLES.TEAM_MEMBER],
    hasAdminPanel: false
  }
};

// USER CREATION Permissions (who can create whom)
const CREATION_RULES = {
  [ROLES.ADMIN]: {
    canCreate: [ROLES.SUPER_USER, ROLES.TEAM_LEAD],
    description: 'Admin can only create Super User and Team Lead'
  },
  [ROLES.TEAM_LEAD]: {
    canCreate: [ROLES.TEAM_MANAGER, ROLES.TEAM_MEMBER],
    description: 'Team Lead can only create Team Managers and Team Members'
  },
  [ROLES.SUPER_USER]: {
    canCreate: [],
    description: 'Super User cannot create any users'
  },
  [ROLES.TEAM_MANAGER]: {
    canCreate: [],
    description: 'Team Manager cannot create any users'
  },
  [ROLES.TEAM_MEMBER]: {
    canCreate: [],
    description: 'Team Member cannot create any users'
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
  CREATION_RULES,
  ENCRYPTION
};
