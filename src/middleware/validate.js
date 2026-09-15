module.exports = (schema, property = 'body') => (req, res, next) => {
  const payload = req[property] == null ? {} : req[property];
  const { error, value } = schema.validate(payload);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  if (property === 'body') {
    req.body = value;
  }
  next();
};
