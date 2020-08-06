// vue.config.js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      // 打包参数配置
      builderOptions: {
        appId: "com.sseakom.app",
        // nsis: {},
        win: {
          target: ['portable']
        },
        // files: ["build", "*.js", "public"],
        asar: true,
      }
    }
  }
}