package com.hebei.policy.web;

import com.hebei.policy.repo.PolicyDao;
import com.hebei.policy.service.CategoryService;
import com.hebei.policy.web.dto.PageResult;
import com.hebei.policy.web.dto.PolicyDetail;
import com.hebei.policy.web.dto.PolicyListItem;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * REST 接口 —— PC 端页面与微信小程序共用同一套 API（互通）。
 */
@RestController
@RequestMapping("/api")
public class PolicyController {

    private final PolicyDao dao;
    private final CategoryService categoryService;

    public PolicyController(PolicyDao dao, CategoryService categoryService) {
        this.dao = dao;
        this.categoryService = categoryService;
    }

    /** 健康检查 */
    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "total", dao.countAll());
    }

    /**
     * 政策分类树（带各级数量）
     * GET /api/categories
     */
    @GetMapping("/categories")
    public List<Map<String, Object>> categories() {
        return categoryService.tree();
    }

    /**
     * 政策列表（分页 + 多条件筛选，按实际顺序倒序）
     *
     * GET /api/policies
     *
     * @param pageNum  页码，默认 1
     * @param pageSize 每页条数，默认 10（需求文档要求每页十条）
     * @param keyword  政策名称关键词
     * @param types    勾选的分类名，逗号分隔（可含父级，后端自动展开为叶子）
     * @param region   all 全部 | country 国家 | hebei 河北 | other 外省 | 6位行政区划码
     * @param timeType 1 近一月 | 2 近半年 | 3 近一年（按发文时间）
     */
    @GetMapping("/policies")
    public PageResult<PolicyListItem> policies(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String types,
            @RequestParam(defaultValue = "all") String region,
            @RequestParam(required = false) Integer timeType) {

        if (pageNum < 1) pageNum = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 50) pageSize = 50;

        List<String> typeList = null;
        if (types != null && !types.isBlank()) {
            typeList = categoryService.expand(
                    java.util.Arrays.stream(types.split(","))
                            .map(String::trim).filter(s -> !s.isEmpty()).toList());
            if (typeList.isEmpty()) typeList = null;
        }

        LocalDate after = null;
        if (timeType != null) {
            LocalDate now = LocalDate.now();
            after = switch (timeType) {
                case 1 -> now.minusMonths(1);
                case 2 -> now.minusMonths(6);
                case 3 -> now.minusYears(1);
                default -> null;
            };
        }

        Map<String, Object> r = dao.search(typeList, region, keyword, after, pageNum, pageSize);
        @SuppressWarnings("unchecked")
        List<PolicyListItem> rows = (List<PolicyListItem>) r.get("rows");
        long total = (Long) r.get("total");
        return PageResult.of(total, pageNum, pageSize, rows);
    }

    /**
     * 政策详情（含全文 HTML）
     * GET /api/policies/{id}
     */
    @GetMapping("/policies/{id}")
    public ResponseEntity<PolicyDetail> detail(@PathVariable long id) {
        PolicyDetail d = dao.findById(id);
        return d == null
                ? ResponseEntity.status(HttpStatus.NOT_FOUND).build()
                : ResponseEntity.ok(d);
    }
}
