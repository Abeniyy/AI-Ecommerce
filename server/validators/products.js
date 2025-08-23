const { body, query, param } = require('express-validator');

const listRules = [
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('page_size').optional().toInt().isInt({ min: 1, max: 100 })
];

const createRules = [
  body('name').isString().isLength({ min: 2, max: 255 }),
  body('description').optional().isString(),
  body('sku').optional().isString().isLength({ max: 64 }),
  body('price').isFloat({ min: 0 }),
  body('category').optional().isString().isLength({ max: 100 }),
  body('stock').optional().toInt().isInt({ min: 0 })
];

const idParam = [param('id').toInt().isInt({ min: 1 })];

module.exports = { listRules, createRules, idParam };

