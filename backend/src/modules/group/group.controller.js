const groupService = require('./group.service');

class GroupController {
  async listGroups(req, res) {
    try {
      const groups = await groupService.getGroupsForUser(req.userId);
      res.json({ success: true, data: groups });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getEligibleMembers(req, res) {
    try {
      const users = await groupService.getEligibleMembers(req.user);
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getGroup(req, res) {
    try {
      const group = await groupService.getGroupDetails(req.params.id, req.userId);
      res.json({ success: true, data: group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async createGroup(req, res) {
    try {
      const group = await groupService.createGroup(req.user, req.body);
      res.status(201).json({ success: true, message: 'Group created', data: group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async addMember(req, res) {
    try {
      const group = await groupService.addMember(req.user, req.params.id, req.body.userId);
      res.json({ success: true, message: 'Member added', data: group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async removeMember(req, res) {
    try {
      const group = await groupService.removeMember(req.user, req.params.id, req.params.userId);
      res.json({ success: true, message: 'Member removed', data: group });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteGroup(req, res) {
    try {
      const result = await groupService.deleteGroup(req.user, req.params.id);
      res.json({ success: true, message: 'Group deleted', data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getMessages(req, res) {
    try {
      const messages = await groupService.getMessages(
        req.params.id,
        req.userId,
        parseInt(req.query.limit, 10) || 50
      );
      res.json({ success: true, data: messages });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new GroupController();
