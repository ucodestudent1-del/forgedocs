const fs = require("fs");
const path = "node_modules/next/dist/compiled/webpack/webpack.js";
let content = fs.readFileSync(path, "utf8");
if (!content.includes("exports.WebpackError")) {
  content = content.replace(
    "Object.assign(exports, require('./bundle5')())",
    "Object.assign(exports, require('./bundle5')())\n    if (exports.webpack && typeof exports.webpack.WebpackError === 'function') { exports.WebpackError = exports.webpack.WebpackError }"
  );
  fs.writeFileSync(path, content);
  console.log("Patched webpack.js to export WebpackError");
} else {
  console.log("webpack.js already patched");
}
