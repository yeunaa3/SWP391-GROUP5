package com.group5.premiumnews.service;

import com.group5.premiumnews.repository.AdminOverviewRepository;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminOverviewService {
    private final AdminOverviewRepository repository;
    public AdminOverviewService(AdminOverviewRepository repository) { this.repository = repository; }
    @Transactional(readOnly = true)
    public Map<String, Object> overview(int days) { return repository.snapshot(days == 7 ? 7 : 30); }
}
