<?php
include("../cors_headers.php");
include("../config/database.php");

$class_id = $_GET['class_id'] ?? 0;

if (!$class_id) {
    echo json_encode(["status" => "error", "message" => "class_id required"]);
    exit;
}

$query = "SELECT schedule_id, class_id, day_of_week, start_time, end_time, device_id 
          FROM class_schedules 
          WHERE class_id = '$class_id' 
          ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), start_time";
$result = mysqli_query($conn, $query);

$schedules = [];
while ($row = mysqli_fetch_assoc($result)) {
    $schedules[] = $row;
}

echo json_encode(["status" => "success", "schedules" => $schedules]);
mysqli_close($conn);
?>