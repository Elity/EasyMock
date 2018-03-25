const WebpackDevServer = require("webpack-dev-server");
const webpack = require("webpack");
const chalk = require("chalk");
const applyMock = require("./mock");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 8888;

function clearConsole() {
  process.stdout.write(
    process.platform === "win32" ? "\x1B[2J\x1B[0f" : "\x1B[2J\x1B[3J\x1B[H"
  );
}

const compiler = webpack({
  entry: "index.js"
});

const devServer = new WebpackDevServer(compiler, {
  disableHostCheck: true,
  compress: true,
  clientLogLevel: "none",
  quiet: true,
  headers: {
    "Access-Control-Allow-Origin": "*"
  },
  publicPath: "/",
  watchOptions: {
    ignored: /node_modules/
  },
  historyApiFallback: {
    disableDotRule: true
  },
  overlay: false,
  host: HOST
});

applyMock(devServer);
devServer.listen(PORT, HOST, err => {
  if (err) {
    console.log(err);
    return;
  }
  clearConsole();
  console.log(chalk.cyan("Mock dev 服务启动...\n"));
});
