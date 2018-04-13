const chalk = require("chalk");

const prefix = "EasyMock:";
/**
 * console.log 在vscode下无法显示。 所以 这一块也要接受自定义
 * TODO
 */
module.exports = {
  err(...arg) {
    console.log(chalk.red.apply(chalk, [prefix, ...arg]));
  },
  info(...arg) {
    console.log(chalk.green.apply(chalk, [prefix, ...arg]));
  }
};
