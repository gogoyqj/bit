#!/usr/bin/env node
'use strict'; // eslint-disable-line

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const JSON5 = require('json5');
const chalk = require('chalk');

function getDepentsFromBitMap(filter, bitConfig) {
  const bitmap = JSON5.parse(fs.readFileSync(path.join(process.cwd(), '.bitmap'), { encoding: 'utf-8' }));
  return Object.keys(bitmap).reduce((ids, id) => {
    if (id !== 'version') {
      if (filter(bitmap[id], bitConfig)) {
        ids.push(id);
      }
    }
    return ids;
  }, []);
}

// 筛选被消费的组件
function importedFilter(cp, bitConfig) {
  const { origin } = cp;
  return origin === 'IMPORTED';
}

// 筛选被定制的消费组件
function customImportedFilter(cp, bitConfig) {
  const [componentsDefaultDirectory] = (bitConfig.componentsDefaultDirectory || 'components/{name}').split('/');
  const { rootDir } = cp;
  return !(rootDir.indexOf(componentsDefaultDirectory) === 0);
}

function getBitConfig() {
  const bitJSONPath = path.join(process.cwd(), 'bit.json');
  const pkgJSONPath = path.join(process.cwd(), 'package.json');
  return fs.existsSync(bitJSONPath) ? require(bitJSONPath) : fs.existsSync(pkgJSONPath) ? require(pkgJSONPath).bit : {};
}

function runBit() {
  // show the command
  console.log(`bit ${process.argv.slice(2).join(' ')}`);
  new Promise(rs => {
    try {
      exec('ssh-add -l', (err, stdout, stderr) => {
        if (err) {
          console.log(
            chalk.red(
              `尝试通过\`ssh-add -l\`获取公钥校验签名失败，你可能不能正常使用 \`kb push\` 或者 \`kb remove\`，错误信息：${err} ${stderr}`
            )
          );
        } else {
          const [, EBIT_SSH_AGENT_SIGN] = stdout.split(' ');
          process.env.EBIT_SSH_AGENT_SIGN = EBIT_SSH_AGENT_SIGN;
        }
        rs();
      });
    } catch (error) {
      console.log(
        chalk.red(
          `尝试通过\`ssh-add -l\`获取公钥校验签名失败，你可能不能正常使用 \`kb push\` 或者 \`kb remove\`，错误信息：${error.message}`
        )
      );
      rs();
    }
  }).then(() => require('./bit'));
}

const skipNpmInstall = '--skip-npm-install';
const skipSaveDependencies = '--skip-save-dependencies';
const override = '--override';
const [, firstOption, ...args] = process.argv;
const [shortName] = process.argv[1].match(/[^\/\\]+$/g) || [];
const hasOverride = args.find(a => a === '--override' || a === '-O');
const hasMerge = args.find(a => a === '--merge' || a === '-m');
const overrideArr = hasMerge || hasOverride ? [] : [override];
const commonArr = [];
if (!args.find(a => a === skipNpmInstall)) {
  commonArr.push(skipNpmInstall);
}
if (!args.find(a => a === skipSaveDependencies)) {
  commonArr.push(skipSaveDependencies);
}
const importArr = commonArr.concat(overrideArr);
const importMergeArr = commonArr.concat(hasMerge ? [] : hasOverride ? [] : ['--merge', 'ours']);
const checkoutArr = commonArr.concat([]);
const optionInFont = firstOption && firstOption[0] === '-';
const componentSpecified = args.find(a => a.indexOf('/') !== -1);
const bitConfig = getBitConfig();
let runDefault = true;
switch (shortName) {
  // short for bit import
  case 'ebi':
    const importedComponents = getDepentsFromBitMap((cp, bitConfig) => {
      return importedFilter(cp, bitConfig) && !customImportedFilter(cp, bitConfig);
    }, bitConfig);
    process.argv = process.argv
      .slice(0, 2)
      .concat(['import'])
      .concat(optionInFont ? importArr : [])
      .concat(args)
      .concat(optionInFont ? [] : importArr)
      .concat(componentSpecified ? [] : importedComponents);
    if (!componentSpecified) {
      const customImportedComponents = getDepentsFromBitMap((cp, bitConfig) => {
        return importedFilter(cp, bitConfig) && customImportedFilter(cp, bitConfig);
      }, bitConfig);
      if (customImportedComponents.length) {
        runDefault = false;
        const subBit = spawn(
          shortName,
          []
            .concat(optionInFont ? importMergeArr : [])
            .concat(args)
            .concat(optionInFont ? [] : importMergeArr)
            .concat(customImportedComponents),
          { stdio: 'inherit' }
        ); // use parent process io

        subBit.on('close', code => {
          if (code) {
            process.exit(code);
          } else {
            runBit();
          }
        });
      }
    }
    if (!componentSpecified && !importedComponents.length) {
      runDefault = false;
      console.log(chalk.green("no 'IMPORTED' components imported"));
    }

    break;
  case 'ebc':
    // short for bit checkout
    process.argv = process.argv
      .slice(0, 2)
      .concat(['checkout'])
      .concat(optionInFont ? checkoutArr : [])
      .concat(args)
      .concat(optionInFont ? [] : checkoutArr);
    break;
  default:
    break;
}

runDefault && runBit();
