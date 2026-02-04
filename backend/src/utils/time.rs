//! Time parsing helpers

/// Parse duration strings like "30s", "15m", "1h", "7d" into seconds.
/// If no unit is provided, treat as seconds.
pub fn parse_duration_seconds(input: &str) -> Option<i64> {
    let trimmed = input.trim().to_lowercase();
    if trimmed.is_empty() {
        return None;
    }

    let last_char = trimmed.chars().last()?;
    if last_char.is_ascii_digit() {
        return trimmed.parse::<i64>().ok();
    }

    let (number_part, unit_part) = trimmed.split_at(trimmed.len() - 1);
    let value: i64 = number_part.parse().ok()?;

    let multiplier = match unit_part {
        "s" => 1,
        "m" => 60,
        "h" => 60 * 60,
        "d" => 60 * 60 * 24,
        _ => return None,
    };

    Some(value.saturating_mul(multiplier))
}
