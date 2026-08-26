def calculate_expenditure_change(current, previous):
    try:
        current = float(current)
        previous = float(previous)
    except (TypeError, ValueError):
        return None

    expenditure_change = current - previous

    return round(expenditure_change, 4)


def calculate_expenditure_change_percent(current, previous):
    """Calculate percentage change in cumulative expenditure."""

    try:
        current = float(current)
        previous = float(previous)
    except (TypeError, ValueError):
        return None

    if previous == 0:
        return None

    expenditure_change_percent = (
        (current - previous) / previous
    ) * 100

    return round(expenditure_change_percent, 4)