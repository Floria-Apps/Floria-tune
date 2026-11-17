//! Floria Tune public API helpers.
//!
//! This module groups shared API concerns: typed errors, pagination
//! validation, and response envelope builders.

pub mod error;

use crate::models::{DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT};

/// Resolve and validate pagination parameters.
///
/// Returns `(page, limit, offset)` on success. Rejects zero or out-of-range
/// values with a human-readable error string.
pub fn parse_pagination(
    page: Option<u32>,
    limit: Option<u32>,
) -> Result<(u32, u32, usize), String> {
    let page = page.unwrap_or(DEFAULT_PAGE);
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT);

    if page == 0 {
        return Err("page deve ser maior que zero".into());
    }
    if limit == 0 {
        return Err("limit deve ser maior que zero".into());
    }

    let offset = (page as usize)
        .saturating_sub(1)
        .saturating_mul(limit as usize);
    Ok((page, limit, offset))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_when_none_provided() {
        let (page, limit, offset) = parse_pagination(None, None).expect("ok");
        assert_eq!(page, DEFAULT_PAGE);
        assert_eq!(limit, DEFAULT_LIMIT);
        assert_eq!(offset, 0);
    }

    #[test]
    fn page_one_limit_fifty_offset_zero() {
        let (page, limit, offset) = parse_pagination(Some(1), Some(50)).expect("ok");
        assert_eq!(page, 1);
        assert_eq!(limit, 50);
        assert_eq!(offset, 0);
    }

    #[test]
    fn page_two_limit_fifty_offset_fifty() {
        let (page, limit, offset) = parse_pagination(Some(2), Some(50)).expect("ok");
        assert_eq!(page, 2);
        assert_eq!(limit, 50);
        assert_eq!(offset, 50);
    }

    #[test]
    fn limit_clamped_to_max() {
        let (_page, limit, _offset) = parse_pagination(Some(1), Some(MAX_LIMIT + 100)).expect("ok");
        assert_eq!(limit, MAX_LIMIT);
    }

    #[test]
    fn rejects_zero_page() {
        let err = parse_pagination(Some(0), Some(50)).expect_err("should fail");
        assert!(err.contains("page"));
    }

    #[test]
    fn rejects_zero_limit() {
        let err = parse_pagination(Some(1), Some(0)).expect_err("should fail");
        assert!(err.contains("limit"));
    }
}
