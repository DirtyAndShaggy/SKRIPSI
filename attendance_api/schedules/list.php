<?php
include("../cors_headers.php");
include("../config/database.php");

$class_id = $_GET['class_id'] ?? null;

if ($class_id) {
    $query = "
    SELECT 
        cs.schedule_id,
        cs.class_id,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.device_id,
        c.class_name,
        c.class_code
    FROM class_schedules cs
    JOIN classes c ON cs.class_id = c.class_id
    WHERE cs.class_id = '$class_id'
    ORDER BY FIELD(cs.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), cs.start_time
    ";
} else {
    $query = "
    SELECT 
        cs.schedule_id,
        cs.class_id,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.device_id,
        c.class_name,
        c.class_code
    FROM class_schedules cs
    JOIN classes c ON cs.class_id = c.class_id
    ORDER BY FIELD(cs.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), cs.start_time
    ";
}

$result = mysqli_query($conn, $query);

$schedules = [];
while ($row = mysqli_fetch_assoc($result)) {
    $schedules[] = $row;
}

echo json_encode(["status" => "success", "schedules" => $schedules]);
mysqli_close($conn);
?>