package com.hebei.policy.service;

import com.hebei.policy.repo.PolicyDao;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 政策分类树服务。
 *
 * 树结构来自《河北省科技政策表结构说明》/《04.河北省科技政策树形结构查询》：
 * 一级 15 类，其中"基础研究与科研基地"、"企业技术进步与高新技术产业化"带二级子类；
 * policy.type 列存储叶子分类名（个别历史数据直接挂在父级名下，故父级勾选 = 自身 + 全部子类）。
 */
@Service
public class CategoryService {

    /** 树节点定义 */
    public record Node(String name, List<Node> children) {
        static Node leaf(String name) {
            return new Node(name, null);
        }
        static Node parent(String name, String... children) {
            List<Node> list = new ArrayList<>();
            for (String c : children) list.add(Node.leaf(c));
            return new Node(name, List.copyOf(list));
        }
    }

    private static final List<Node> TREE = List.of(
            Node.leaf("综合"),
            Node.leaf("科研机构改革"),
            Node.leaf("科技计划管理"),
            Node.leaf("科技经费与财务"),
            Node.parent("基础研究与科研基地", "基础研究", "平台基地"),
            Node.parent("企业技术进步与高新技术产业化", "企业", "产业", "创新载体"),
            Node.leaf("农村科技与社会发展"),
            Node.leaf("科技人才"),
            Node.leaf("科技中介服务"),
            Node.leaf("科技条件与标准"),
            Node.leaf("科技金融与税收"),
            Node.leaf("科技成果与知识产权"),
            Node.leaf("科技奖励"),
            Node.leaf("科学技术普及"),
            Node.leaf("国际科技合作"));

    /** 父级名 -> 子级名列表 */
    private static final Map<String, List<String>> CHILDREN = new LinkedHashMap<>();

    static {
        for (Node n : TREE) {
            if (n.children() != null) {
                List<String> cs = new ArrayList<>();
                for (Node c : n.children()) cs.add(c.name());
                CHILDREN.put(n.name(), cs);
            }
        }
    }

    private final PolicyDao dao;

    public CategoryService(PolicyDao dao) {
        this.dao = dao;
    }

    /**
     * 带数量的分类树：
     * { name, count, children: [ { name, count } ] }
     * 父级 count = 自身 count + 全部子类 count。
     */
    public List<Map<String, Object>> tree() {
        Map<String, Long> counts = dao.countByType();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Node n : TREE) {
            result.add(toMap(n, counts));
        }
        return result;
    }

    private static Map<String, Object> toMap(Node n, Map<String, Long> counts) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", n.name());
        long self = counts.getOrDefault(n.name(), 0L);
        if (n.children() == null) {
            m.put("count", self);
        } else {
            long sum = self;
            List<Map<String, Object>> children = new ArrayList<>();
            for (Node c : n.children()) {
                Map<String, Object> cm = toMap(c, counts);
                children.add(cm);
                sum += (Long) cm.get("count");
            }
            m.put("count", sum);
            m.put("children", children);
        }
        return m;
    }

    /**
     * 把前端勾选的节点展开为查询用的叶子分类集合：
     * 勾中父级 => 父级名 + 全部子类名（父级名下也可能有历史数据）。
     */
    public List<String> expand(List<String> selected) {
        if (selected == null || selected.isEmpty()) return List.of();
        List<String> out = new ArrayList<>();
        for (String s : selected) {
            if (!out.contains(s)) out.add(s);
            List<String> cs = CHILDREN.get(s);
            if (cs != null) {
                for (String c : cs) if (!out.contains(c)) out.add(c);
            }
        }
        return out;
    }
}
