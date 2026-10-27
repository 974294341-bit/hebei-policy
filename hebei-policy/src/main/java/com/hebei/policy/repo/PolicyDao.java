package com.hebei.policy.repo;

import com.hebei.policy.web.dto.PolicyDetail;
import com.hebei.policy.web.dto.PolicyListItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * policy 表数据访问（JdbcTemplate 直写 SQL，同时兼容 MySQL 与 H2-MySQL 模式）。
 *
 * 注意：range / rank / year 为 MySQL 保留字，SQL 中一律使用反引号。
 */
@Repository
public class PolicyDao {

    private final JdbcTemplate jdbc;

    public PolicyDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 列表查询列（不含全文，保证轻量） */
    private static final String LIST_COLS =
            "id, name, type, category, `range`, document, form, organ, viadata, perdata";

    /** 详情查询列（含全部业务字段与全文） */
    private static final String ALL_COLS =
            LIST_COLS + ", pubdata, field, theme, keyword, superior, precursor, succeed, state, " +
            "text, pdf, redundancy, `rank`, policykey, newrank, `year`, newkey, secondtheme, allsum";

    /**
     * 分页查询政策列表。
     *
     * @param types   分类（叶子分类名集合，已含父级展开），null/空 = 全部
     * @param region  all | country | hebei | other | 6位行政区划码
     * @param keyword 政策名称关键词，null/空 = 不过滤
     * @param after   发文时间下限（近一月/近半年/近一年），null = 不过滤
     * @param pageNum  页码（1 起）
     * @param pageSize 每页条数（需求要求默认 10）
     * @return 总数 + 当前页数据
     */
    public Map<String, Object> search(List<String> types, String region, String keyword,
                                      LocalDate after, int pageNum, int pageSize) {
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        List<Object> args = new ArrayList<>();

        if (types != null && !types.isEmpty()) {
            where.append(" AND type IN (");
            for (int i = 0; i < types.size(); i++) {
                if (i > 0) where.append(",");
                where.append("?");
                args.add(types.get(i));
            }
            where.append(") ");
        }
        if (region != null) {
            switch (region) {
                case "country" -> { where.append(" AND `range` LIKE ? "); args.add("%000000%"); }
                case "hebei"   -> { where.append(" AND `range` LIKE ? "); args.add("%130000%"); }
                case "other"   -> where.append(
                        " AND `range` IS NOT NULL AND `range` <> '' " +
                        " AND `range` NOT LIKE '%000000%' AND `range` NOT LIKE '%130000%' ");
                default -> {
                    if (region.matches("\\d{6}")) {
                        where.append(" AND `range` LIKE ? ");
                        args.add("%" + region + "%");
                    }
                }
            }
        }
        if (keyword != null && !keyword.isBlank()) {
            where.append(" AND name LIKE ? ");
            args.add("%" + keyword.trim() + "%");
        }
        if (after != null) {
            where.append(" AND viadata >= ? ");
            args.add(Date.valueOf(after));
        }

        // 主页面要求：按实际顺序（发文时间 viadata，其次录入顺序 id）倒序排列
        String order = " ORDER BY viadata DESC, id DESC ";

        Long total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM policy" + where, Long.class, args.toArray());

        int offset = Math.max(0, pageNum - 1) * pageSize;
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(pageSize);
        pageArgs.add(offset);

        List<PolicyListItem> rows = jdbc.query(
                "SELECT " + LIST_COLS + " FROM policy" + where + order + " LIMIT ? OFFSET ?",
                (rs, i) -> mapListItem(rs),
                pageArgs.toArray());

        Map<String, Object> result = new HashMap<>();
        result.put("total", total == null ? 0 : total);
        result.put("rows", rows);
        return result;
    }

    /** 按 id 查详情（含全文），不存在返回 null */
    public PolicyDetail findById(long id) {
        List<PolicyDetail> list = jdbc.query(
                "SELECT " + ALL_COLS + " FROM policy WHERE id = ?",
                (rs, i) -> mapDetail(rs), id);
        return list.isEmpty() ? null : list.get(0);
    }

    /** 各叶子分类的数量：type -> count */
    public Map<String, Long> countByType() {
        Map<String, Long> map = new LinkedHashMap<>();
        jdbc.query("SELECT type, COUNT(*) AS c FROM policy WHERE type IS NOT NULL AND type <> '' GROUP BY type",
                rs -> {
                    map.put(rs.getString("type"), rs.getLong("c"));
                });
        return map;
    }

    /** 总条数 */
    public long countAll() {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM policy", Long.class);
        return n == null ? 0 : n;
    }

    // ---------- 行映射 ----------

    private static PolicyListItem mapListItem(ResultSet rs) throws SQLException {
        return new PolicyListItem(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("type"),
                rs.getString("category"),
                rs.getString("range"),
                rs.getString("document"),
                rs.getString("form"),
                rs.getString("organ"),
                toDate(rs, "viadata"),
                toDate(rs, "perdata"));
    }

    private static PolicyDetail mapDetail(ResultSet rs) throws SQLException {
        return new PolicyDetail(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("type"),
                rs.getString("category"),
                rs.getString("range"),
                rs.getString("document"),
                rs.getString("form"),
                rs.getString("organ"),
                toDate(rs, "viadata"),
                toDate(rs, "pubdata"),
                toDate(rs, "perdata"),
                rs.getString("field"),
                rs.getString("theme"),
                rs.getString("keyword"),
                rs.getString("state"),
                rs.getString("text"),
                rs.getString("pdf"));
    }

    private static LocalDate toDate(ResultSet rs, String col) throws SQLException {
        Date d = rs.getDate(col);
        return d == null ? null : d.toLocalDate();
    }
}
