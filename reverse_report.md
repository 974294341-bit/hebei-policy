# 科技政策一点通（kjzc.hebsti.cn）逆向分析报告

> 目标站点：`https://kjzc.hebsti.cn/technology`
> 分析时间：2026-10-27
> 结论：**前端为 Vue + Webpack（Element UI）SPA，后端为基于 `/prod-api` 的 REST 接口，政策数据接口完全开放，无需登录鉴权即可读取。**

---

## 1. 站点概况

| 项 | 内容 |
|---|---|
| 站点名称 | 科技政策一点通 |
| 域名 | kjzc.hebsti.cn（河北省科技信息相关） |
| 入口页 | `/technology` 科技政策（导航：政策动态 / 科技政策 / 政策解读 / 知识问答 等） |
| 前端技术栈 | Vue 2 + Vue Router + Element UI（由 `chunk-elementUI` / `chunk-libs` 推断） |
| 构建工具 | Webpack（多 chunk 懒加载，带 contenthash 文件名） |
| Web 服务器 | nginx/1.24.0 |
| 渲染方式 | 客户端渲染（SPA），首页仅 `#app` 占位 + loader，数据全部异步拉取 |

---

## 2. 资源加载链路

1. 访问 `/technology` → 返回 16KB 的 `index.html`（含 loader 动画与 webpack runtime）。
2. 依次加载：
   - `/static/js/chunk-elementUI.58da34c0.js`
   - `/static/js/chunk-libs.91e22dcc.js`（含 axios 封装、请求拦截器）
   - `/static/js/app.e27ead2f.js`（主 bundle，含路由表与接口字符串）
3. 路由按需懒加载对应业务 chunk，例如科技政策页：
   - `/static/js/chunk-196c5752.253fa80a.js`

---

## 3. 接口基础信息

- **API Base URL（由 `app.js` 中 axios 配置确认）：** `/prod-api`
- **完整前缀：** `https://kjzc.hebsti.cn/prod-api`
- **鉴权：** 读取类接口（政策列表/详情/分类）**无需 Token**，匿名可直接调用；仅 `/auth/*`、`/system/*` 等后台类接口可能需登录。
- **统一响应结构：**
  ```json
  { "code": 200, "msg": "查询成功", "total": 1854, "rows": [ ... ] }
  ```
  列表类返回 `{ code, msg, total, rows }`；单条详情返回 `{ code, msg, data: {...} }`。

---

## 4. 完整接口清单（从 app.js 提取）

### 4.1 科技政策模块（本次逆向重点，`/technology` 页）
| 方法 | 路径（相对于 /prod-api） | 说明 |
|---|---|---|
| GET | `/bus/pc/policyfulltext/getPolicyTypes` | 获取政策分类树（含各级数量 num） |
| GET | `/bus/pc/policyfulltext/list` | 政策列表（分页 + 筛选） |
| GET | `/bus/pc/policyfulltext/{id}` | 政策详情（含 `policyFullText` 正文 HTML） |
| GET | `bus/pc/policyfulltext/fulltextWord/{id}` | 下载政策原文 Word（blob），**仅当存在上传附件时可用** |

### 4.2 其他业务模块（路由级，接口前缀同 `/bus/pc/...` 规律，未逐一深入）
- 政策动态：`/pctrends`、`/pctrends/trendsDetails`
- 政策解读：`/unscramble`、`/unscramble/read`、`/unscramble/characters`、`/unscramble/readDetails`
- 知识问答：`/questions`、`/questions/quDetails`
- 培训：`/cultivate`、`/cultivate/videoDetails`
- 首页：`/home`；地方/重点：`/prefecture`、`/keyPoint`、`/keyPointDetail`

### 4.3 鉴权 / 系统（后台，通常需登录）
- `/auth/login`、`/auth/logout`、`/auth/refresh`、`/auth/register`、`/code`
- `/system/config/*`、`/system/dict/data/*`、`/system/user/getInfo`、`/system/menu/getRouters`、`/system/logininfor/*`
- `/user/profile`、`/prod-api/file/upload`

---

## 5. 政策列表接口详解（核心）

**请求**
```
GET /prod-api/bus/pc/policyfulltext/list
Query 参数（来自前端 queryParams + searchBtn 逻辑）：
  pageNum      int    页码，默认 1
  pageSize     int    每页条数，前端默认 12
  content      str    标题关键词搜索（对应搜索框，可空）
  timeType     int    时间范围：1=近一月, 2=近半年, 3=近一年（可空）
  appliScope   int    适用范围：
                  -1 = 国家
                  130000 = 河北（省级行政区划码）
                  -2 = 外省
                  null/缺省 = 全部
                  也可传具体省份码（如 340000 安徽、370000 山东）
  policyTypes  str    分类筛选，逗号分隔的分类 value（来自 getPolicyTypes），
                  例如 "11" 或 "6,11"
```

**响应**（节选单条 `rows[]` 字段）
```json
{
  "policyId": 2532,
  "policyName": "中国人民银行等多部门 印发《...》",
  "sendArticleOrgan": "中国人民银行等多部门",
  "appliScope": -1,
  "sendArticleTime": "2026-10-19",
  "policyStatus": 1,
  "policyFullFile": null,
  "policyLinkVos": null
}
```

**实测验证（无需登录）**
- 不加筛选：`total = 1854`
- `appliScope=-1`（国家）：`total = 219`
- `policyTypes=11`（科技金融与税收）：`total = 146`

---

## 6. 分类树接口详解

**请求**
```
GET /prod-api/bus/pc/policyfulltext/getPolicyTypes
```
**响应** `data` 为树状数组，每项 `{ label, value, num, children? }`，例如：
```json
[
  { "num": 321, "label": "综合",        "value": 1 },
  { "num": 211, "label": "科技计划管理", "value": 3 },
  { "num": 235, "label": "基础研究与科研基地", "value": 5,
    "children": [ {"num":52,"label":"基础研究","value":51},
                  {"num":183,"label":"科研基地","value":52} ] },
  ...
  { "num": 150, "label": "科技金融与税收", "value": 11 }
]
```
前端把勾选到的**叶子节点 value** 拼成 `policyTypes=51,52,...` 传给列表接口。

---

## 7. 政策详情接口详解

**请求**
```
GET /prod-api/bus/pc/policyfulltext/{id}
```
**响应** `data` 中含：
- `policyFullText`：政策正文，**HTML 片段**（带 `<p class="MsoNormal">` 等 Word 导出样式），可直接渲染或转 Markdown。
- `policyName` / `sendArticleOrgan` / `sendArticleTime` / `appliScope` / `keyWords` 等元数据。
- `policyFullFile`：原文 Word 附件路径（为空则该政策无附件，`fulltextWord` 接口将 404）。

---

## 8. 安全与合规提示

- 列表/详情均为**公开读取接口**，未做访问限制，适合做政策采集与检索。
- **请勿高频请求**：建议加合理延迟、控制并发，避免对源站造成压力。
- 数据版权归站点运营方所有，采集结果仅用于个人研究/检索，勿用于商业转售或大规模镜像。
- 后台类（`/auth/*`、`/system/*`）接口涉及账号体系，未做登录逆向，不建议尝试绕过鉴权。

---

## 9. 可直接复用的调用示例（Python）

见同目录 `kjzc_client.py`，已实现：获取分类树、分页+筛选拉取政策列表、获取单条详情与正文。运行：
```bash
python kjzc_client.py
```
