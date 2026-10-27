const api = require('../../utils/api.js');

Page({
  data: {
    loading: true,
    policy: null,
    meta: []   // [{k, v}]
  },

  onLoad(options) {
    if (!options.id) {
      this.setData({ loading: false });
      return;
    }
    api.getPolicyDetail(options.id).then((p) => {
      const meta = [];
      if (p.type) meta.push({ k: '政策分类', v: p.type });
      if (p.organ) meta.push({ k: '制定机关', v: p.organ });
      if (p.document) meta.push({ k: '发文字号', v: p.document });
      if (p.viadata) meta.push({ k: '发文时间', v: p.viadata });
      if (p.perdata) meta.push({ k: '施行日期', v: p.perdata });
      if (p.range) meta.push({ k: '施行范围', v: p.range });
      wx.setNavigationBarTitle({ title: '政策全文' });
      this.setData({ loading: false, policy: p, meta });
    }).catch((e) => {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    });
  },

  /** 复制政策名称（全文为空时的兜底提示） */
  copyName() {
    if (this.data.policy && this.data.policy.name) {
      wx.setClipboardData({ data: this.data.policy.name });
    }
  }
});
