<?php
include("../cors_headers.php");
include("../config/database.php");

$schedule_id = $_GET['schedule_id'] ?? 0;

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "schedule_id required"]);
    exit;
}

// ─── Get original schedule ───
$scheduleQuery = "
    SELECT cs.*, c.class_code, c.class_name 
    FROM class_schedules cs
    JOIN classes c ON cs.class_id = c.class_id
    WHERE cs.schedule_id = '$schedule_id'
";
$scheduleResult = mysqli_query($conn, $scheduleQuery);
if (!$scheduleResult || mysqli_num_rows($scheduleResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Schedule not found"]);
    exit;
}
$original = mysqli_fetch_assoc($scheduleResult);

// ─── Get all other schedules for this class (not cancelled, not archived) ───
$query = "
    SELECT 
        schedule_id, 
        day_of_week, 
        start_time, 
        end_time,
        CONCAT(day_of_week, ' ', start_time, '-', end_time) as display_name
    FROM class_schedules
    WHERE class_id = '{$original['class_id']}'
    AND schedule_id != '$schedule_id'
    AND is_cancelled = 0
    AND is_archived = 0
    AND lecturer_id = '{$original['lecturer_id']}'
    ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), start_time
";

$result = mysqli_query($conn, $query);
$schedules = [];
while ($row = mysqli_fetch_assoc($result)) {
    $schedules[] = $row;
}

echo json_encode([
    "status" => "success",
    "original" => $original,
    "available_schedules" => $schedules
]);

mysqli_close($conn);
?>