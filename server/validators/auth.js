const { body } = require('express-validator');

const registerRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 chars'),
  body('full_name').optional().isLength({ max: 120 }),
  body('phone').optional().isString().isLength({ max: 40 }).withMessage('Phone too long'),
];

const loginRules = [
  body('email').isEmail(),
  body('password').isString().notEmpty()
];

const verifyRules = [
  body('email').isEmail()
];

module.exports = { registerRules, loginRules, verifyRules };
