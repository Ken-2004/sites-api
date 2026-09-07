const mongoose = require("mongoose");

const SITE_FIELDS = {
  siteName: "string",
  description: "string",
  designated: "number",
  image: "string"
};

function sendValidationError(res, messages) {
  return res.status(400).json({
    error: {
      message: "Request validation failed",
      details: messages
    }
  });
}

function validateRegistration(req, res, next) {
  if (!isObjectBody(req.body)) return sendValidationError(res, ["body must be a JSON object"]);
  const { password, password2 } = req.body;
  const userName = typeof req.body.userName === "string" ? req.body.userName.trim() : "";
  const errors = [];

  if (!userName) errors.push("userName is required");
  if (typeof password !== "string" || !password) errors.push("password is required");
  if (typeof password2 !== "string" || !password2) errors.push("password2 is required");
  if (typeof password === "string" && password.length > 0 && password.length < 8) {
    errors.push("password must be at least 8 characters long");
  }
  if (password && password2 && password !== password2) errors.push("passwords must match");

  if (errors.length > 0) return sendValidationError(res, errors);
  req.body.userName = userName;
  return next();
}

function validateLogin(req, res, next) {
  if (!isObjectBody(req.body)) return sendValidationError(res, ["body must be a JSON object"]);
  const userName = typeof req.body.userName === "string" ? req.body.userName.trim() : "";
  const errors = [];

  if (!userName) errors.push("userName is required");
  if (typeof req.body.password !== "string" || !req.body.password) {
    errors.push("password is required");
  }

  if (errors.length > 0) return sendValidationError(res, errors);
  req.body.userName = userName;
  return next();
}

function validatePagination(req, res, next) {
  const page = Number(req.query.page);
  const perPage = Number(req.query.perPage);
  const errors = [];

  if (!Number.isInteger(page) || page < 1) errors.push("page must be a positive integer");
  if (!Number.isInteger(perPage) || perPage < 1) {
    errors.push("perPage must be a positive integer");
  } else if (perPage > 100) {
    errors.push("perPage must not exceed 100");
  }

  if (errors.length > 0) return sendValidationError(res, errors);
  req.query.page = String(page);
  req.query.perPage = String(perPage);
  return next();
}

function validateObjectId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return sendValidationError(res, ["id must be a valid MongoDB ObjectId"]);
  }
  return next();
}

function validateSite(req, res, next) {
  if (!isObjectBody(req.body)) return sendValidationError(res, ["body must be a JSON object"]);
  const errors = [];

  for (const [field, expectedType] of Object.entries(SITE_FIELDS)) {
    if (req.body[field] !== undefined && typeof req.body[field] !== expectedType) {
      errors.push(`${field} must be a ${expectedType}`);
    }
  }

  if (req.body.dates !== undefined) {
    if (!Array.isArray(req.body.dates)) {
      errors.push("dates must be an array");
    } else {
      req.body.dates.forEach((date, index) => {
        if (!date || typeof date !== "object" || Array.isArray(date)) {
          errors.push(`dates[${index}] must be an object`);
          return;
        }
        if (date.year !== undefined && typeof date.year !== "string") {
          errors.push(`dates[${index}].year must be a string`);
        }
        if (date.type !== undefined && typeof date.type !== "string") {
          errors.push(`dates[${index}].type must be a string`);
        }
      });
    }
  }

  validateNestedObject(req.body.location, "location", {
    town: "string",
    latitude: "number",
    longitude: "number"
  }, errors);
  validateNestedObject(req.body.provinceOrTerritory, "provinceOrTerritory", {
    code: "string",
    name: "string",
    type: "string",
    region: "string",
    capital: "string"
  }, errors);

  if (errors.length > 0) return sendValidationError(res, errors);
  return next();
}

function validateNestedObject(value, field, types, errors) {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${field} must be an object`);
    return;
  }
  for (const [key, expectedType] of Object.entries(types)) {
    if (value[key] !== undefined && typeof value[key] !== expectedType) {
      errors.push(`${field}.${key} must be a ${expectedType}`);
    }
  }
}

function isObjectBody(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
  validateLogin,
  validateObjectId,
  validatePagination,
  validateRegistration,
  validateSite
};
