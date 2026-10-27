# 河北省科技政策查询系统（Java Web + 微信小程序）

按《04.河北省科技政策树形结构查询》需求实现：**主界面参考科技政策一点通（kjzc.hebsti.cn/technology）**，
左侧分类树过滤、每页十条分页、政策列表**按实际顺序（发文时间）倒序排列**；PC 电脑端网页与手机端
微信小程序**共用同一套 Spring Boot 后端接口（互通）**。

---

## 一、系统架构

```
┌─────────────────┐        ┌──────────────────────┐
│  PC 电脑端网页    │        │   微信小程序（手机端）  │
│  static/index    │        │   miniprogram/       │
│  static/detail   │        │   pages/index|detail │
└────────┬────────┘        └──────────┬───────────┘
         │  HTTP  /api/**             │  wx.request /api/**
         ▼                            ▼
┌─────────────────────────────────────────────┐
│        Spring Boot 后端（REST API）           │
│  /api/categories   分类树（带数量）            │
│  /api/policies     分页列表（倒序+筛选）        │
│  /api/policies/id  详情（含全文 HTML）          │
└──────────────────────┬──────────────────────┘
                       │ JdbcTemplate
                       ▼
        ┌──────────────────────────────┐
        │  MySQL：policy 表（735 条）    │
        │  演示模式：H2 内存库（样例 45 条）│
        └──────────────────────────────┘
```

## 二、目录结构

```
hebei-policy/
├── pom.xml                                # Maven 配置（Spring Boot 3.4 / Java 17）
├── src/main/java/com/hebei/policy/
│   ├── PolicyApplication.java             # 启动类
│   ├── config/WebConfig.java              # CORS 跨域
│   ├── repo/PolicyDao.java                # policy 表 SQL 访问（分页/筛选/详情）
│   ├── service/CategoryService.java       # 分类树（需求文档定义的 3 级树）
│   ├── web/PolicyController.java          # REST 接口
│   └── web/dto/                           # PolicyListItem / PolicyDetail / PageResult
├── src/main/resources/
│   ├── application.yml                    # 双配置：h2demo（默认）/ mysql
│   ├── schema-h2.sql + data-h2.sql        # H2 演示库（从 policy.sql 抽样）
│   └── static/                            # ★ PC 电脑端网页
│       ├── index.html / js/index.js       #   主界面：树过滤+搜索+筛选+分页
│       ├── detail.html                    #   政策全文详情
│       ├── pctrends.html                  #   政策动态（栏目页，内容待接入）
│       ├── unscramble.html                #   政策解读（栏目页，内容待接入）
│       ├── questions.html                 #   政策问答（栏目页，内容待接入）
│       ├── cultivate.html                 #   政策培训（栏目页，内容待接入）
│       └── css/style.css
├── miniprogram/                           # ★ 微信小程序（手机端）
│   ├── app.js / app.json / app.wxss
│   ├── config/config.js                   #   ★ 改后端地址 BASE_URL
│   ├── utils/api.js                       #   请求封装
│   └── pages/index|detail/                #   政策全文 / 详情
└── README.md
```

## 三、快速启动（H2 演示模式，零配置）

```bash
cd hebei-policy
mvn spring-boot:run
```

启动后：
- **PC 端主界面**：浏览器打开 http://localhost:8080
- **栏目页**：/pctrends.html（政策动态）、/unscramble.html（政策解读）、/questions.html（政策问答）、/cultivate.html（政策培训）——当前为占位页，顶部导航均可点击跳转
- **接口自测**：http://localhost:8080/api/health

> 默认内置 H2 内存库 + 45 条样例数据（覆盖全部分类），用于开发演示。
> H2 数据为 `policy.sql` 抽样，`text` 全文字段截断至 3000 字符。

## 四、生产模式（MySQL，导入完整 policy.sql）

1. 建库并导入数据表：
   ```sql
   CREATE DATABASE policy DEFAULT CHARACTER SET utf8;
   USE policy;
   SOURCE C:/path/to/policy.sql;      -- 或命令行: mysql -uroot -p policy < policy.sql
   ```
2. 修改 `src/main/resources/application.yml` 中 `mysql` 段的账号密码：
   ```yaml
   spring:
     config:
       activate:
         on-profile: mysql
     datasource:
       url: jdbc:mysql://localhost:3306/policy?...
       username: root
       password: "你的密码"
   ```
3. 以 mysql 配置启动：
   ```bash
   mvn spring-boot:run -Dspring-boot.run.profiles=mysql
   # 或打包: mvn package -DskipTests && java -jar target/policy-server-1.0.0.jar --spring.profiles.active=mysql
   ```

## 五、微信小程序（手机端）配置

1. 用**微信开发者工具** → 导入项目 → 目录选 `hebei-policy/miniprogram`（AppID 可先用测试号）。
2. 修改 `miniprogram/config/config.js` 的 `BASE_URL`：
   - 开发者工具本机调试：`http://localhost:8080`，并在「详情 → 本地设置」勾选
     **「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」**；
   - 真机预览：改成电脑局域网 IP（如 `http://192.168.1.100:8080`），手机与电脑同一 WiFi；
   - 正式上线：需 HTTPS 域名并在微信公众平台配置 request 合法域名。
3. 编译运行：首页（搜索 / 全部-国家-河北-外省 / 分类树筛选 / 卡片列表每页 10 条触底加载），
   点卡片进详情（元数据 + rich-text 全文）。

## 六、REST API 文档（PC 与小程序共用）

### GET /api/health
健康检查 → `{"status":"ok","total":735}`

### GET /api/categories
政策分类树（含各级数量），父级 count = 自身 + 子类合计。
```json
[ { "name":"综合", "count":87 },
  { "name":"基础研究与科研基地", "count":108, "children":[
      {"name":"基础研究","count":29}, {"name":"平台基地","count":79} ] }, ... ]
```

### GET /api/policies
分页查询，**按实际顺序倒序（发文时间 viadata DESC，其次 id DESC）**。

| 参数 | 说明 |
|---|---|
| pageNum  | 页码，默认 1 |
| pageSize | 每页条数，默认 **10**（需求要求每页十条） |
| keyword  | 政策名称关键词（模糊） |
| types    | 勾选分类名，逗号分隔；父级自动展开为"自身+子类" |
| region   | `all` 全部 / `country` 国家(000000) / `hebei` 河北(130000) / `other` 外省 / 6位行政区划码 |
| timeType | `1` 近一月 / `2` 近半年 / `3` 近一年（按发文时间） |

响应：`{code, msg, total, pages, pageNum, pageSize, rows:[{id,name,type,category,range,document,form,organ,viadata,perdata}]}`

### GET /api/policies/{id}
政策详情，含 `text` 全文 HTML、`pdf` 附件路径等；不存在返回 404。

## 七、数据字典（policy 表关键字段）

| 字段 | 含义 | 示例 |
|---|---|---|
| name | 政策名称 | 国务院关于印发2030年前碳达峰行动方案的通知 |
| type | 政策分类（叶子名） | 科技计划管理 |
| category | 二级类别 | 其他 |
| range | 施行范围"名称（区划码 缩写）" | 河北省（130000 HE） / 全国（000000 QG） |
| document | 发文字号 | 国发〔2021〕23号 |
| form | 颁布形式 | 国务院令（行政法规） |
| organ | 制定机关 | 国务院 |
| viadata | **发文/通过日期（列表排序依据）** | 2021-10-24 |
| pubdata | 数据入库（批量导入）日期 | 2022-10-13 |
| perdata | 施行日期 | 2021-10-24 |
| text | 政策全文（Word 转换的 HTML） | `<p class=...>` |

> 排序说明：需求要求"主页面按上传内容按实际顺序倒排序"。数据中 `pubdata` 为批量导入日期
> （仅 2022-06-20 / 2022-10-13 两批），不具时间线意义，因此实际排序取 **viadata（发文时间）
> DESC，id DESC** 兜底；如需改为其他字段，在 `PolicyDao.search()` 的 `ORDER BY` 处调整。

## 八、需求符合性对照

| 需求（04.河北省科技政策树形结构查询） | 实现 |
|---|---|
| 主界面样式参考 kjzc.hebsti.cn/technology | PC 端 index.html：蓝 banner + 导航 + 左树右列表 |
| 左侧树形结构过滤 | 分类树勾选（父级联动子类），实时过滤 |
| 分页显示、每页十条 | pageSize 默认 10，数字分页 + 跳页 |
| 按实际顺序倒序 | viadata DESC, id DESC |
| MySQL policy 表 | JdbcTemplate 直连，字段一一对应 |
| 电脑端与手机端互通 | 同一 Spring Boot REST API，两客户端共用 |
