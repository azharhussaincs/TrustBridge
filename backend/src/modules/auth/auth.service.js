const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');

class AuthService {
  async register(userData) {
    const { username, password, name, role, teamId } = userData;
    
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: role || 'TEAM_MEMBER',
        teamId
      }
    });
    
    return user;
  }
  
  async login(username, password) {
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        teamId: user.teamId
      }
    };
  }
  
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new AuthService();
