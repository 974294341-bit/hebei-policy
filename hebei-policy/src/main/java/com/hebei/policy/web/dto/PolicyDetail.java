package com.hebei.policy.web.dto;

import java.time.LocalDate;

/**
 * 政策详情（含全文 HTML）
 */
public record PolicyDetail(
        Long id,
        String name,
        String type,
        String category,
        String range,
        String document,
        String form,
        String organ,
        LocalDate viadata,
        LocalDate pubdata,
        LocalDate perdata,
        String field,
        String theme,
        String keyword,
        String state,
        String text,
        String pdf) {
}
