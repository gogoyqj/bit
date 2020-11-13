export default function(src, options: Record<string, any> = {}) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const compiler = require('vue-template-compiler');
  const finalDependencies = {};
  const addDependencies = (dependencies, isScript) => {
    let objDependencies = {};
    if (Array.isArray(dependencies)) {
      dependencies.forEach(dependency => {
        objDependencies[dependency] = {};
      });
    } else {
      objDependencies = dependencies;
    }
    Object.keys(objDependencies).forEach(dependency => {
      finalDependencies[dependency] = objDependencies[dependency];
      finalDependencies[dependency].isScript = isScript;
    });
  };

  const { script, styles } = compiler.parseComponent(src, { pad: 'line' });
  // it must be required here, otherwise, it'll be a cyclic dependency
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const precinct = require('../../precinct').default;
  if (script) {
    // INFO: 如在 .vue 文件内，设置 script lang 为 js，当做未设置 lang 处理，否则不能正确解析依赖。
    if (script.lang && script.lang !== 'js') {
      options.type = script.lang;
    } else {
      options.useContent = true;
    }
    const dependencies = precinct(script.content, options);
    addDependencies(dependencies, true);
  }
  if (styles) {
    styles.forEach(style => {
      const dependencies = precinct(style.content, { type: style.lang || 'scss' });
      addDependencies(dependencies, false);
    });
  }

  return finalDependencies;
}
