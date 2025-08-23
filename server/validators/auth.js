const { body } = require('express-validator');

const registerRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 chars'),
  body('full_name').optional().isLength({ max: 120 })
];

const loginRules = [
  body('email').isEmail(),
  body('password').isString().notEmpty()
];

module.exports = { registerRules, loginRules };
