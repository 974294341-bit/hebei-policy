/**
 * 请求封装 —— 与 PC 端共用同一套后端 REST 接口（互通）
 */
const { BASE_URL } = require('../config/config.js');

function request(path) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method: 'GET',
      header: { Accept: 'application/json' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

/** 分类树（带各级数量） */
function getCategories() {
  return request('/api/categories');
}

/**
 * 政策列表（分页 + 筛选，按实际顺序倒序，每页默认 10 条）
 * @param {object} p {pageNum,pageSize,keyword,types,region,timeType}
 */
function getPolicies(p) {
  const q = [];
  q.push('pageNum=' + (p.pageNum || 1));
  q.push('pageSize=' + (p.pageSize || 10));
  q.push('region=' + (p.region || 'all'));
  if (p.keyword) q.push('keyword=' + encodeURIComponent(p.keyword));
  if (p.types && p.types.length) q.push('types=' + encodeURIComponent(p.types.join(',')));
  if (p.timeType) q.push('timeType=' + p.timeType);
  return request('/api/policies?' + q.join('&'));
}

/** 政策详情（含全文 HTML） */
function getPolicyDetail(id) {
  return request('/api/policies/' + id);
}

module.exports = { getCategories, getPolicies, getPolicyDetail };
