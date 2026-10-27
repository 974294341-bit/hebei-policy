package com.hebei.policy.web.dto;

import java.util.List;

/**
 * 统一分页响应结构（PC 端与小程序共用）
 */
public record PageResult<T>(
        int code,
        String msg,
        long total,
        int pages,
        int pageNum,
        int pageSize,
        List<T> rows) {

    public static <T> PageResult<T> of(long total, int pageNum, int pageSize, List<T> rows) {
        int pages = (int) ((total + pageSize - 1) / pageSize);
        return new PageResult<>(200, "查询成功", total, pages, pageNum, pageSize, rows);
    }
}
