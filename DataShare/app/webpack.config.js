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
      { from: "./src/index.html", to: "index.html" },
      { from: "./src/upload.html", to: "upload.html" },
      { from: "./src/detail.html", to: "detail.html" },
      { from: "./src/index.css", to: "index.css" },
      { from: "./src/upload.css", to: "upload.css" },
      { from: "./src/detail.css", to: "detail.css" }
    ]),
  ],
  devServer: { contentBase: path.join(__dirname, "dist"), compress: true },
};
