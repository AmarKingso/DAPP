const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: "./src/scripts/index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: "./src/html/index.html", to: "index.html" },
      { from: "./src/html/upload.html", to: "upload.html" },
      { from: "./src/html/detail.html", to: "detail.html" },
      { from: "./src/html/myupload.html", to: "myupload.html" },
      { from: "./src/html/mydownload.html", to: "mydownload.html" },
      { from: "./src/css/index.css", to: "index.css" },
      { from: "./src/css/upload.css", to: "upload.css" },
      { from: "./src/css/detail.css", to: "detail.css" },
      { from: "./src/css/myupload.css", to: "myupload.css" },
      { from: "./src/css/mydownload.css", to: "mydownload.css" },
      { from: "./src/css/dropmenu.css", to: "dropmenu.css" },
      { from: "./src/css/pagination.css", to: "pagination.css" }
    ]),
  ],
  devServer: { contentBase: path.join(__dirname, "dist"), compress: true },
};
