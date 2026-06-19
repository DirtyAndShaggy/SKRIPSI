<?php
include("../cors_headers.php");
include("../config/database.php");

$day = $_GET['day'] ?? date('l');
$device_id = $_GET['device_id'] ?? 'ESP32_01';

// Get current time
$currentTime = date('H:i:s');

$query = "
SELECT 
    cs.schedule_id,
    cs.class_id,
    cs.start_time,
    cs.end_time,
    cs.day_of_week,
    c.class_name,
    c.class_code,
    c.lecturer_name,
    c.room_name
FROM class_schedules cs
JOIN classes c ON cs.class_id = c.class_id
WHERE cs.day_of_week = '$day'
AND cs.device_id = '$device_id'
AND '$currentTime' BETWEEN cs.start_time AND cs.end_time
LIMIT 1
";

$result = mysqli_query($conn, $query);

if ($row = mysqli_fetch_assoc($result)) {
    echo json_encode([
        "status" => "success",
        "schedule" => $row
    ]);
} else {
    // Check if there's any schedule for today (even if not active yet)
    $fallbackQuery = "
    SELECT 
        cs.schedule_id,
        cs.class_id,
        cs.start_time,
        cs.end_time,
        cs.day_of_week,
        c.class_name,
        c.class_code,
        c.lecturer_name,
        c.room_name
    FROM class_schedules cs
    JOIN classes c ON cs.class_id = c.class_id
    WHERE cs.day_of_week = '$day'
    AND cs.device_id = '$device_id'
    ORDER BY cs.start_time ASC
    LIMIT 1
    ";
    
    $fallbackResult = mysqli_query($conn, $fallbackQuery);
    
    if ($row = mysqli_fetch_assoc($fallbackResult)) {
        echo json_encode([
            "status" => "success",
            "schedule" => $row,
            "message" => "No active schedule right now. Showing next schedule."
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "No schedule found for today"
        ]);
    }
}

mysqli_close($conn);
?>