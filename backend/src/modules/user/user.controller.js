const userService = require('./user.service');

class UserController {
  async getUsers(req, res) {
    try {
      const { role, teamId } = req.query;
      const users = await userService.getUsers({ role, teamId });
      res.json({ success: true, data: users });
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
      const user = await userService.createUser(req.body, req.user.role);
      res.status(201).json({ 
        success: true, 
        message: 'User created successfully', 
        data: user 
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
  
  async deleteUser(req, res) {
    try {
      await userService.deleteUser(req.params.id);
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
}

module.exports = new UserController();
