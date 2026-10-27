/**
 * PC 端主界面逻辑：分类树 + 筛选 + 分页列表（按实际顺序倒序，每页 10 条）
 */
(function () {
  'use strict';

  var state = {
    selectedTypes: [],   // 勾选的分类（叶子+父级名）
    keyword: '',
    timeType: null,      // 1 近一月 2 近半年 3 近一年
    region: 'all',       // all country hebei other
    pageNum: 1,
    pageSize: 10,
    total: 0,
    pages: 0
  };

  // ---------- 工具 ----------
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return (s == null ? '' : String(s))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // ---------- 分类树 ----------
  var treeData = [];

  function renderTree() {
    var box = $('#tree');
    box.innerHTML = '';
    treeData.forEach(function (node) { box.appendChild(nodeEl(node, 0)); });
    bindTreeEvents();
  }

  function nodeEl(node, level) {
    var wrap = document.createElement('div');
    wrap.className = 't-node';
    wrap.dataset.name = node.name;

    var row = document.createElement('div');
    row.className = 't-row';
    if (state.selectedTypes.indexOf(node.name) >= 0) row.classList.add('selected');

    var caret = document.createElement('span');
    caret.className = 't-caret' + (node.children ? '' : ' hidden');
    caret.textContent = '▶';
    row.appendChild(caret);

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 't-check';
    cb.dataset.name = node.name;
    cb.checked = state.selectedTypes.indexOf(node.name) >= 0;
    row.appendChild(cb);

    var label = document.createElement('span');
    label.textContent = node.name;
    row.appendChild(label);

    var count = document.createElement('span');
    count.className = 't-count';
    count.textContent = '(' + node.count + ')';
    row.appendChild(count);

    wrap.appendChild(row);

    var childrenBox = null;
    if (node.children) {
      childrenBox = document.createElement('div');
      childrenBox.className = 't-children';
      node.children.forEach(function (c) { childrenBox.appendChild(nodeEl(c, level + 1)); });
      wrap.appendChild(childrenBox);
    }
    wrap._childrenBox = childrenBox;
    wrap._caret = caret;
    return wrap;
  }

  function bindTreeEvents() {
    var box = $('#tree');
    // 展开/收起
    box.querySelectorAll('.t-caret:not(.hidden)').forEach(function (caret) {
      caret.addEventListener('click', function (e) {
        e.stopPropagation();
        var wrap = caret.closest('.t-node');
        var child = wrap._childrenBox;
        if (!child) return;
        child.classList.toggle('open');
        caret.classList.toggle('open');
      });
    });
    // 勾选
    box.querySelectorAll('.t-check').forEach(function (cb) {
      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () {
        var name = cb.dataset.name;
        if (cb.checked) {
          if (state.selectedTypes.indexOf(name) < 0) state.selectedTypes.push(name);
        } else {
          state.selectedTypes = state.selectedTypes.filter(function (n) { return n !== name; });
        }
        refreshRowStyle();
        state.pageNum = 1;
        loadList();
      });
    });
    // 点击行文字 = 切换勾选
    box.querySelectorAll('.t-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('t-caret')) return;
        var cb = row.querySelector('.t-check');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });
    });
  }

  function refreshRowStyle() {
    document.querySelectorAll('#tree .t-row').forEach(function (row) {
      var name = row.querySelector('.t-check').dataset.name;
      row.classList.toggle('selected', state.selectedTypes.indexOf(name) >= 0);
    });
  }

  $('#clearTree').addEventListener('click', function () {
    state.selectedTypes = [];
    document.querySelectorAll('#tree .t-check').forEach(function (cb) { cb.checked = false; });
    refreshRowStyle();
    state.pageNum = 1;
    loadList();
  });

  // ---------- 列表 ----------
  function loadList() {
    var q = [
      'pageNum=' + state.pageNum,
      'pageSize=' + state.pageSize,
      'region=' + state.region
    ];
    if (state.keyword) q.push('keyword=' + encodeURIComponent(state.keyword));
    if (state.selectedTypes.length) q.push('types=' + encodeURIComponent(state.selectedTypes.join(',')));
    if (state.timeType) q.push('timeType=' + state.timeType);

    $('#empty').style.display = 'none';
    $('#plist').innerHTML = '<li style="justify-content:center;color:#aaa">加载中…</li>';

    getJSON('/api/policies?' + q.join('&')).then(function (res) {
      state.total = res.total;
      state.pages = res.pages;
      renderList(res.rows);
      renderPager();
    }).catch(function (e) {
      $('#plist').innerHTML = '';
      $('#empty').style.display = 'block';
      $('#empty').textContent = '加载失败：' + e.message;
    });
  }

  function regionTag(rangeStr) {
    if (!rangeStr) return '';
    if (rangeStr.indexOf('000000') >= 0) return '国家';
    if (rangeStr.indexOf('130000') >= 0) return '河北';
    return '外省';
  }

  function renderList(rows) {
    var ul = $('#plist');
    ul.innerHTML = '';
    if (!rows || !rows.length) {
      $('#empty').style.display = 'block';
      $('#empty').textContent = '暂无符合条件的政策';
      return;
    }
    rows.forEach(function (p) {
      var li = document.createElement('li');

      var dot = document.createElement('span');
      dot.className = 'p-dot'; dot.textContent = '●';
      li.appendChild(dot);

      var t = document.createElement('span');
      t.className = 'p-title';
      t.textContent = (p.name || '').replace(/\s+/g, ' ');
      t.title = p.name || '';
      t.addEventListener('click', function () {
        location.href = 'detail.html?id=' + p.id;
      });
      li.appendChild(t);

      var tag = document.createElement('span');
      tag.className = 'p-tag';
      tag.textContent = regionTag(p.range);
      li.appendChild(tag);

      var d = document.createElement('span');
      d.className = 'p-date';
      d.textContent = p.viadata || '';
      li.appendChild(d);

      ul.appendChild(li);
    });
  }

  // ---------- 分页 ----------
  function pageWindow(cur, total) {
    var nums = [], start = Math.max(1, cur - 2), end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    for (var i = start; i <= end; i++) nums.push(i);
    return nums;
  }

  function renderPager() {
    $('#pTotal').textContent = '共 ' + state.total + ' 条';
    var box = $('#pNums');
    box.innerHTML = '';
    var prev = $('#pPrev'), next = $('#pNext');
    prev.className = 'p-btn' + (state.pageNum <= 1 ? ' disabled' : '');
    next.className = 'p-btn' + (state.pageNum >= state.pages ? ' disabled' : '');

    if (state.pages <= 0) { $('#pager').style.display = 'none'; return; }
    $('#pager').style.display = 'flex';

    var nums = pageWindow(state.pageNum, state.pages);
    if (nums[0] > 1) {
      box.appendChild(numEl(1));
      if (nums[0] > 2) box.appendChild(ellipsisEl());
    }
    nums.forEach(function (n) { box.appendChild(numEl(n)); });
    if (nums[nums.length - 1] < state.pages) {
      if (nums[nums.length - 1] < state.pages - 1) box.appendChild(ellipsisEl());
      box.appendChild(numEl(state.pages));
    }
    $('#pJump').value = state.pageNum;
  }

  function numEl(n) {
    var a = document.createElement('a');
    a.className = 'p-num' + (n === state.pageNum ? ' cur' : '');
    a.textContent = n;
    a.href = 'javascript:void(0)';
    a.addEventListener('click', function () { goPage(n); });
    return a;
  }
  function ellipsisEl() {
    var s = document.createElement('span');
    s.className = 'p-ellipsis'; s.textContent = '…';
    return s;
  }
  function goPage(n) {
    if (n < 1 || n > state.pages) return;
    state.pageNum = n;
    loadList();
    window.scrollTo({ top: 0 });
  }

  $('#pPrev').addEventListener('click', function () { goPage(state.pageNum - 1); });
  $('#pNext').addEventListener('click', function () { goPage(state.pageNum + 1); });
  $('#pOk').addEventListener('click', function () {
    goPage(parseInt($('#pJump').value, 10) || 1);
  });

  // ---------- 筛选 ----------
  $('#btnSearch').addEventListener('click', function () {
    state.keyword = $('#kw').value.trim();
    state.pageNum = 1;
    loadList();
  });
  $('#kw').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('#btnSearch').click();
  });
  document.querySelectorAll('input[name="time"]').forEach(function (r) {
    r.addEventListener('change', function () {
      state.timeType = r.value ? parseInt(r.value, 10) : null;
      state.pageNum = 1;
      loadList();
    });
  });
  document.querySelectorAll('input[name="region"]').forEach(function (r) {
    r.addEventListener('change', function () {
      state.region = r.value;
      state.pageNum = 1;
      loadList();
    });
  });

  // ---------- 启动 ----------
  getJSON('/api/categories').then(function (data) {
    treeData = data;
    renderTree();
  }).catch(function () { /* 树加载失败不影响列表 */ });
  loadList();
})();
