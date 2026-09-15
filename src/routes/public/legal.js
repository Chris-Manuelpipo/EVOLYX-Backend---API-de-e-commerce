const router = require('express').Router();
const company = require('../../config/company');

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      company: company.legalName,
      brand: company.name,
      city: company.city,
      country: company.country,
      email: company.email,
      phone: company.phone,
      website: company.website,
      shop: company.shop,
    },
  });
});

module.exports = router;
