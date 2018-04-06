var webpack = require("webpack");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: "./src/app/mainAppComponent.js",
    output: {
        path: __dirname + "/src",
        filename: "bundle.min.js"
    },
    module: {
        loaders: [
            { test: /\.css$/, loader: "style!css" }
        ],
        
        rules: [
            {
            test: [/\.js$/],
            exclude: [/node_modules/],
            loader: 'babel-loader',
            options: { presets: ['es2015'] }
            }
        ]
    }/*,
    plugins: [
        new UglifyJsPlugin()
    ]*/
};