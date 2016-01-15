#!/usr/bin/env node

var fs = require("fs");
var path = require("path");

var libdir = path.dirname(process.argv[1]);
var command = process.argv[2];
var context = process.argv[3] && path.resolve(process.argv[3]);

// Print version
var version = JSON.parse(fs.readFileSync(libdir + "/package.json")).version;
console.log("react-beaker " + version + "\n");

// Validate arguments
if (!command || !context || ["watch", "build", "publish"].indexOf(command) < 0) {
    help();
    process.exit(1);
}

// Find all JavaScript entries
var entry = {};
var entriesDir = context + "/js/entries/";
fs.readdirSync(entriesDir).forEach(function(filename) {
    if (/.*\.sw.$/.test(filename) === false) {
        entry[filename.replace(/\.[^\.]+$/, "")] = entriesDir + filename;
    }
});

// Find all HTML files
var pages = fs.readdirSync(context + "/html").filter(function(filename) {
    return /.*\.sw.$/.test(filename) === false;
});

// Choose options
var options = {};
switch (command) {
    case "watch":
        options = {
            "sourceMap": true,
            "minimize": false,
            "filename": "[name].min.js",
        };
        break;
    case "build":
        options = {
            "sourceMap": false,
            "minimize": false,
            "filename": "[name].js",
        };
        break;
    case "publish":
        options = {
            "sourceMap": false,
            "minimize": true,
            "filename": "[name].min.js",
        };
        break;
}

var webpack = require(libdir + "/node_modules/webpack");
var HtmlWebpackPlugin = require(libdir + "/node_modules/html-webpack-plugin");

var compiler = webpack({
    devtool: options.sourceMap && "inline-source-map",
    context: context,
    resolve: {
        extensions: ["", ".js", ".jsx"],
        alias: {
            "react":        libdir + "/alias/react.js",
            "react-dom":    libdir + "/alias/react-dom.js",
            "react-router": libdir + "/alias/react-router.js",
            "redux":        libdir + "/alias/redux.js",
        }
    },
    resolveLoader: {
        modulesDirectories: [libdir + "/node_modules"]
    },
    entry: entry,
    output: {
        path: context + "/dist",
        filename: options.filename,
    },
    module: {
        loaders: [{
            test: /\.jsx$/,
            exclude: /node_modules/,
            loader: "babel",
            query: {
                presets: [
                    libdir + "/node_modules/babel-preset-react",
                    libdir + "/node_modules/babel-preset-es2015",
                ]
            },
        }, {
            test: /\.less$/,
            loader: "style!css!less",
        }]
    },
    plugins: pages.map(function(filename) {
        return new HtmlWebpackPlugin({
            filename: filename,
            template: context + "/html/" + filename,
        });
    }).concat(options.minimize ? [
        new webpack.optimize.UglifyJsPlugin({minimize: true})
    ] : []),
});

function buildReactCore() {
    webpack({
        context: libdir,
        entry: libdir + "/react-toolkit.js",
        output: {
            path: context + "/dist",
            filename: "react-toolkit.min.js",
        },
        plugins: [new webpack.optimize.UglifyJsPlugin({minimize: true})]
    }).run(function(){});
}

function watch() {
    buildReactCore();
    compiler.watch({poll: true}, function(err, stats) {
        console.log(stats.toString({colors: true}));
    });
}

function build() {
    buildReactCore();
    compiler.run(function(err, stats) {
        console.log(stats.toString({colors: true}));
    });
}

function help() {
    console.error("Usage:");
    console.error("  react-beaker watch   <source dir>");
    console.error("  react-beaker build   <source dir>");
    console.error("  react-beaker publish <source dir>");
}

if (command === "watch") watch();
if (command === "build") build();
if (command === "publish") build();