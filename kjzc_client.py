#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
科技政策一点通 (kjzc.hebsti.cn) 接口客户端
逆向自前端 SPA，API 基础路径 /prod-api，政策读取接口无需登录。

仅用于个人研究 / 政策检索。请勿高频请求，避免对源站造成压力。
"""

import json
import urllib.parse
import urllib.request

BASE = "https://kjzc.hebsti.cn/prod-api"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"


def _get(path: str, params: dict | None = None) -> dict:
    url = BASE + path
    if params:
        # 过滤掉 None / 空字符串
        clean = {k: v for k, v in params.items() if v is not None and v != ""}
        if clean:
            url += "?" + urllib.parse.urlencode(clean)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_policy_types() -> list:
    """获取政策分类树（含各级数量）"""
    return _get("/bus/pc/policyfulltext/getPolicyTypes").get("data", [])


def list_policies(page_num: int = 1, page_size: int = 12, content: str = None,
                  time_type: int = None, appli_scope: int = None,
                  policy_types: str = None) -> dict:
    """
    政策列表（分页 + 筛选）
      content      标题关键词
      time_type    1=近一月 2=近半年 3=近一年
      appli_scope  -1 国家 / 130000 河北 / -2 外省 / 省份码 / None 全部
      policy_types 逗号分隔的分类 value（来自 get_policy_types）
    """
    params = {
        "pageNum": page_num,
        "pageSize": page_size,
        "content": content,
        "timeType": time_type,
        "appliScope": appli_scope,
        "policyTypes": policy_types,
    }
    data = _get("/bus/pc/policyfulltext/list", params)
    return {"total": data.get("total"), "rows": data.get("rows", [])}


def get_policy_detail(policy_id: int) -> dict:
    """政策详情，含 policyFullText 正文 HTML"""
    return _get(f"/bus/pc/policyfulltext/{policy_id}").get("data", {})


def demo():
    print("== 分类树（前 5 项）==")
    types = get_policy_types()
    for t in types[:5]:
        print(f"  {t['value']:>3}  {t['label']:<14} ({t.get('num')})")

    print("\n== 政策列表（国家，第 1 页，每页 3 条）==")
    res = list_policies(page_num=1, page_size=3, appli_scope=-1)
    print("  total =", res["total"])
    for r in res["rows"]:
        print(f"  [{r['policyId']}] {r['policyName'].strip()[:40]}  | {r.get('sendArticleTime')}")

    if res["rows"]:
        pid = res["rows"][0]["policyId"]
        print(f"\n== 详情 policyId={pid}（正文前 120 字）==")
        detail = get_policy_detail(pid)
        text = detail.get("policyFullText", "") or ""
        # 简单去标签
        import re
        plain = re.sub(r"<[^>]+>", "", text)
        print("  ", plain[:120].replace("\n", " "))
        print("  policyFullFile =", detail.get("policyFullFile"))


if __name__ == "__main__":
    demo()
