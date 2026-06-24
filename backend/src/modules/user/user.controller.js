const userService = require('./user.service');

class UserController {
  async getUsers(req, res) {
    try {
      const { role, teamId, context } = req.query;
      const users = await userService.getUsers({ role, teamId, context }, req.user);

      const payload = { success: true, data: users };
      if (req.user.role === 'TEAM_LEAD') {
        const team = await userService.ensureLeadTeam(req.user);
        payload.teamId = team.id;
      }

      res.json(payload);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async getUserById(req, res) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async createUser(req, res) {
    try {
      const user = await userService.createUser(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async updateUser(req, res) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      res.json({ 
        success: true, 
        message: 'User updated successfully', 
        data: user 
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateOwnProfile(req, res) {
    try {
      const user = await userService.updateOwnProfile(req.userId, req.body);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async deleteUser(req, res) {
    try {
      await userService.deleteUser(req.params.id, req.user);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async getUsersByRole(req, res) {
    try {
      const users = await userService.getUsersByRole(req.params.role);
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async getTeamMembers(req, res) {
    try {
      const users = await userService.getTeamMembers(req.params.teamId);
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // NEW: Reset user password (Admin only)
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      
      const result = await userService.resetPassword(id, newPassword);
      res.json({
        success: true,
        message: 'Password reset successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new UserController();
