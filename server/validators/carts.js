const { body, param } = require('express-validator');

const upsertItemRules = [
  body('product_id').toInt().isInt({ min: 1 }),
  body('quantity').toInt().isInt({ min: 1 })
];

const productIdParam = [param('productId').toInt().isInt({ min: 1 })];

module.exports = { upsertItemRules, productIdParam };
