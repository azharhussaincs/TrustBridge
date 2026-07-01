const express = require('express');
const router = express.Router();
const groupController = require('./group.controller');
const authMiddleware = require('../auth/auth.middleware');

router.use(authMiddleware.authenticate);

router.get('/', groupController.listGroups);
router.get('/inbox/recent', groupController.getRecentInbox);
router.get('/eligible-members', groupController.getEligibleMembers);
router.post('/', groupController.createGroup);
router.post('/:id/messages', groupController.sendMessage);
router.get('/:id/messages', groupController.getMessages);
router.get('/:id', groupController.getGroup);
router.post('/:id/members', groupController.addMember);
router.delete('/:id/members/:userId', groupController.removeMember);
router.delete('/:id', groupController.deleteGroup);

module.exports = router;
