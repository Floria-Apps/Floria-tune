use serde::{Deserialize, Serialize};

pub const DEFAULT_PAGE: u32 = 1;
pub const DEFAULT_LIMIT: u32 = 50;
pub const MAX_LIMIT: u32 = 200;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pagination {
    pub page: u32,
    pub limit: u32,
    pub total: u64,
    pub total_pages: u64,
}

impl Pagination {
    pub fn build(page: u32, limit: u32, total: u64) -> Self {
        let limit_u64 = u64::from(limit);
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(limit_u64)
        };
        Self {
            page,
            limit,
            total,
            total_pages,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Paginated<T> {
    pub items: Vec<T>,
    pub pagination: Pagination,
}

impl<T> Paginated<T> {
    pub fn new(items: Vec<T>, page: u32, limit: u32, total: u64) -> Self {
        Self {
            items,
            pagination: Pagination::build(page, limit, total),
        }
    }
}
