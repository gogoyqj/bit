#!/usr/bin/env node
'use strict'; // eslint-disable-line
const request = require('request');

const [, , action, base64Scope] = process.argv;
if (action === '_delete' || action === '_put') {
  const { EBIT_SSH_AGENT_SIGN } = process.env;
  const scopeName = Buffer.from(base64Scope || '', 'base64')
    .toString()
    .split('/')[3];
  if (!EBIT_SSH_AGENT_SIGN) {
    throw `没有 '${scopeName}' 写权限，请安装最新版本 ebit-bin 或者通过管理后台添加权限`;
  } else {
    request.post(
      {
        url: 'http://localhost/manage/api/open/scope/writeable',
        body: {
          sign: EBIT_SSH_AGENT_SIGN,
          scopeName
        },
        json: true
      },
      function(error, response, body) {
        if (body && body.code === 0) {
          require('./bit');
        } else {
          throw `没有 '${scopeName}' 写权限，请安装最新版本 ebit-bin 或者通过管理后台添加权限`;
        }
      }
    );
  }
} else {
  require('./bit');
}
