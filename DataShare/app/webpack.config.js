const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: "./src/index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: "./src/html/index.html", to: "index.html" },
      { from: "./src/html/upload.html", to: "upload.html" },
      { from: "./src/html/detail.html", to: "detail.html" },
      { from: "./src/css/index.css", to: "index.css" },
      { from: "./src/css/upload.css", to: "upload.css" },
      { from: "./src/css/detail.css", to: "detail.css" }
    ]),
  ],
  devServer: { contentBase: path.join(__dirname, "dist"), compress: true },
};
