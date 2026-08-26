def calculate_cost_features(originalCost, revisedCost, cumulativeExpenditure):
    """
    Calculate financial features for one project observation.

    Returns:
        costIncrease:
            Absolute change between revised and original cost.

        costIncreasePercent:
            Percentage change relative to original cost.

        costRatio:
            Revised cost / original cost.

        expenditureRatio:
            Cumulative expenditure / revised cost.
    """

    try:
        originalCost = float(originalCost)
        revisedCost = float(revisedCost)
        cumulativeExpenditure = float(cumulativeExpenditure)
    except (TypeError, ValueError):
        return {
            "costIncrease": None,
            "costIncreasePercent": None,
            "costRatio": None,
            "expenditureRatio": None
        }

    costIncrease = revisedCost - originalCost

    # Original cost cannot be used as a denominator
    if originalCost > 0:
        costIncreasePercent = (costIncrease / originalCost) * 100
        costRatio = revisedCost / originalCost
    else:
        costIncreasePercent = None
        costRatio = None

    # Revised cost cannot be zero because it is the denominator
    if revisedCost > 0:
        expenditureRatio = cumulativeExpenditure / revisedCost
    else:
        expenditureRatio = None

    return {
        "costIncrease": round(costIncrease, 4),
        "costIncreasePercent": round(costIncreasePercent, 4)
            if costIncreasePercent is not None else None,
        "costRatio": round(costRatio, 4)
            if costRatio is not None else None,
        "expenditureRatio": round(expenditureRatio, 4)
            if expenditureRatio is not None else None
    }

def calculate_expenditure_change(current, previous):
    """Calculate change in cumulative expenditure."""

    try:
        current = float(current)
        previous = float(previous)
    except (TypeError, ValueError):
        return None

    expenditure_change = current - previous

    return round(expenditure_change, 4)