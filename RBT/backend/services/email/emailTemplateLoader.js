const fs = require("fs");
const path = require("path");

const TEMPLATES_DIR = path.join(
  __dirname,
  "templates"
);

function loadTemplate(templatePath, variables = {}) {
  const filePath = path.join(
    TEMPLATES_DIR,
    templatePath
  );

  if (!fs.existsSync(filePath)) {
    const error = new Error(
      `Email template not found: ${templatePath}`
    );

    error.code = "EMAIL_TEMPLATE_NOT_FOUND";
    error.status = 500;

    throw error;
  }

  let html = fs.readFileSync(
    filePath,
    "utf8"
  );

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;

    html = html.replaceAll(
      placeholder,
      value === undefined || value === null
        ? ""
        : String(value)
    );
  }

  const remainingPlaceholders = [
    ...html.matchAll(/{{([A-Z0-9_]+)}}/g),
  ].map((match) => match[1]);

  if (remainingPlaceholders.length > 0) {
    const uniquePlaceholders = [
      ...new Set(remainingPlaceholders),
    ];

    const error = new Error(
      `Missing email template variables: ${uniquePlaceholders.join(", ")}`
    );

    error.code = "EMAIL_TEMPLATE_VARIABLES_MISSING";
    error.status = 500;

    throw error;
  }

  return html;
}

module.exports = {
  loadTemplate,
};