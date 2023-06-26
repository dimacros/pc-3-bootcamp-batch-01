const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  devtool: "eval-source-map",
  mode: "development",
  entry: "./src/index.js",
  devServer: {
    static: "./dist",
    hot: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: 'body',
      title: "Interacting with smart contract",
      template: "index.html",
    }),
  ],
  resolve: {
    extensions: [".js", ".json"],
  },
  output: {
    filename: "[name].bundle.js",
    clean: true,
  },
};
