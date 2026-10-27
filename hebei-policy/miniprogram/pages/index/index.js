const api = require('../../utils/api.js');

const REGION_TABS = [
  { key: 'all', label: '全部' },
  { key: 'country', label: '国家' },
  { key: 'hebei', label: '河北' },
  { key: 'other', label: '外省' }
];

Page({
  data: {
    regionTabs: REGION_TABS,
    region: 'all',
    keyword: '',
    // 分类树面板
    showCats: false,
    cats: [],
    expanded: {},        // name -> bool 展开状态
    selectedTypes: [],
    // 列表
    list: [],
    page: 1,
    total: 0,
    hasMore: true,
    loading: false
  },

  onLoad() {
    const app = getApp();
    if (app.globalData.categories.length) {
      this.setData({ cats: app.globalData.categories });
    } else {
      this.loadCats();
    }
    this.reload();
  },

  onPullDownRefresh() {
    this.loadCats();
    this.reload(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMore();
  },

  loadCats() {
    api.getCategories().then((cats) => {
      getApp().globalData.categories = cats;
      this.setData({ cats });
    }).catch(() => {});
  },

  // ---------- 列表 ----------
  buildQuery(page) {
    return {
      pageNum: page,
      pageSize: 10,
      keyword: this.data.keyword,
      types: this.data.selectedTypes,
      region: this.data.region
    };
  },

  reload(done) {
    this.setData({ loading: true });
    api.getPolicies(this.buildQuery(1)).then((res) => {
      this.setData({
        list: res.rows || [],
        total: res.total,
        page: 1,
        hasMore: (res.rows || []).length < res.total,
        loading: false
      });
      if (done) done();
    }).catch((e) => {
      this.setData({ loading: false, hasMore: false });
      wx.showToast({ title: '加载失败，请检查后端服务', icon: 'none' });
      if (done) done();
    });
  },

  loadMore() {
    const next = this.data.page + 1;
    this.setData({ loading: true });
    api.getPolicies(this.buildQuery(next)).then((res) => {
      const rows = res.rows || [];
      this.setData({
        list: this.data.list.concat(rows),
        page: next,
        hasMore: this.data.list.length + rows.length < res.total && rows.length > 0,
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  // ---------- 交互 ----------
  onKwInput(e) { this.setData({ keyword: e.detail.value }); },

  onSearch() { this.reload(); },

  onRegionTap(e) {
    this.setData({ region: e.currentTarget.dataset.key });
    this.reload();
  },

  toggleCats() { this.setData({ showCats: !this.data.showCats }); },

  toggleExpand(e) {
    const name = e.currentTarget.dataset.name;
    const expanded = Object.assign({}, this.data.expanded);
    expanded[name] = !expanded[name];
    this.setData({ expanded });
  },

  onCheckCat(e) {
    const name = e.currentTarget.dataset.name;
    const sel = this.data.selectedTypes.slice();
    const i = sel.indexOf(name);
    if (i >= 0) sel.splice(i, 1); else sel.push(name);
    this.setData({ selectedTypes: sel });
  },

  resetCats() { this.setData({ selectedTypes: [] }); this.reload(); },

  confirmCats() {
    this.setData({ showCats: false });
    this.reload();
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  }
});
