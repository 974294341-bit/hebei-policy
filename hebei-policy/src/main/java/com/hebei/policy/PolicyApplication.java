package com.hebei.policy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 河北省科技政策查询系统 启动类
 *
 * 演示模式（默认，内置 H2 内存库 + 样例数据）：
 *   mvn spring-boot:run
 *
 * 生产模式（MySQL，需先导入 policy.sql）：
 *   mvn spring-boot:run -Dspring-boot.run.profiles=mysql
 *   或 java -jar policy-server-1.0.0.jar --spring.profiles.active=mysql
 */
@SpringBootApplication
public class PolicyApplication {
    public static void main(String[] args) {
        SpringApplication.run(PolicyApplication.class, args);
    }
}
