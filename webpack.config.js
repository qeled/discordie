const debug = process.env.NODE_ENV !== "production";

const webpack = require("webpack");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

const html = new HtmlWebpackPlugin({
  filename: 'index.html',
  template: 'src/index.html',
  inject: false
});

const css = new ExtractTextPlugin("assets/[chunkhash].css");

module.exports = {
  cache: true,
  devtool: "sourcemap",
  entry: './src/index.js',
  output: { path: 'public', filename: 'assets/[hash].js' },
  module: {
    loaders: [
      {
        test: /\.jsx?$/, exclude: /node_modules/, loader: 'babel',
        query: { presets: ['react', 'es2015', 'stage-0'], plugins: ["react-html-attrs"] }
      },
      { test: /\.scss$/, loader: ExtractTextPlugin.extract("style", "css!sass", {publicPath: "../"}) },
      { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&minetype=application/font-woff&name=assets/[hash].[ext]" },
      { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader?name=assets/[hash].[ext]" },
      { test: /\.json$/, loader: 'json' },
    ]
  },
  plugins: debug ? [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    html, css
  ] : [
    new webpack.DefinePlugin({
      'process.env': { 'NODE_ENV': JSON.stringify('production') }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({compress: {warnings: false}}),
    new webpack.NoErrorsPlugin(),
    html, css
  ]
};