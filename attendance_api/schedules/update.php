<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$schedule_id = $data['schedule_id'] ?? 0;
$class_id = $data['class_id'] ?? 0;
$room_id = $data['room_id'] ?? null;
$day_of_week = $data['day_of_week'] ?? '';
$start_time = $data['start_time'] ?? '';
$end_time = $data['end_time'] ?? '';
$device_id = $data['device_id'] ?? 'ESP32_01';
$semester = $data['semester'] ?? null;

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "Schedule ID required"]);
    exit;
}

if (!$class_id || !$day_of_week || !$start_time || !$end_time) {
    echo json_encode(["status" => "error", "message" => "All fields are required"]);
    exit;
}

// Check for overlapping schedule (excluding current schedule)
$checkQuery = "
SELECT schedule_id FROM class_schedules 
WHERE class_id = '$class_id' 
AND day_of_week = '$day_of_week'
AND schedule_id != '$schedule_id'
AND (
    ('$start_time' BETWEEN start_time AND end_time) OR
    ('$end_time' BETWEEN start_time AND end_time) OR
    (start_time BETWEEN '$start_time' AND '$end_time')
)
";

$checkResult = mysqli_query($conn, $checkQuery);

if (mysqli_num_rows($checkResult) > 0) {
    echo json_encode(["status" => "error", "message" => "Schedule overlaps with existing schedule for this class"]);
    exit;
}
$grace_period = $data['grace_period'] ?? 15;
$grace_period_value = $grace_period ? "'$grace_period'" : "15";
$room_value = $room_id ? "'$room_id'" : "NULL";
$semester_value = $semester ? "'$semester'" : "NULL";

$query = "UPDATE class_schedules SET 
          class_id = '$class_id',
          room_id = $room_value,
          day_of_week = '$day_of_week',
          start_time = '$start_time',
          end_time = '$end_time',
          device_id = '$device_id',
          semester = $semester_value
            grace_period = $grace_period_value
          WHERE schedule_id = '$schedule_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Schedule updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>