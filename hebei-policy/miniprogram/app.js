const api = require('./utils/api.js');

App({
  globalData: {
    categories: []   // 分类树缓存
  },

  onLaunch() {
    // 预取分类树，首页直接使用
    api.getCategories()
      .then((data) => { this.globalData.categories = data; })
      .catch(() => { /* 网络异常时首页会重试 */ });
  }
});
