package com.hebei.policy.web.dto;

import java.time.LocalDate;

/**
 * 政策列表项（不含全文 text，保证列表接口轻量）
 */
public record PolicyListItem(
        Long id,
        String name,
        String type,
        String category,
        String range,
        String document,
        String form,
        String organ,
        LocalDate viadata,
        LocalDate perdata) {
}
