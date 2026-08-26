def schedule_risk_signal(schedule):
    schedule_state = schedule.get("scheduleState")
    velocity_ratio = schedule.get("velocityRatio")
    remaining_progress = schedule.get("remainingProgress")

    if schedule_state in ["overdue_incomplete", "stalled", "regressing"]:
        return "high"

    if schedule_state == "behind":
        if (
            velocity_ratio is not None
            and velocity_ratio > 2
            and remaining_progress is not None
            and remaining_progress > 5
        ):
            return "high"

        return "medium"

    if schedule_state in ["on_track", "completed"]:
        return "low"

    return "medium"