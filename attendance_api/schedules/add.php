<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_id = $data['class_id'] ?? 0;
$group_id = $data['group_id'] ?? null;
$room_id = $data['room_id'] ?? null;
$lecturer_id = $data['lecturer_id'] ?? null;
$day_of_week = $data['day_of_week'] ?? '';
$start_time = $data['start_time'] ?? '';
$end_time = $data['end_time'] ?? '';
$device_id = $data['device_id'] ?? 'ESP32_01';
$semester = $data['semester'] ?? null;
$grace_period = $data['grace_period'] ?? 15;

if (!$class_id || !$group_id || !$day_of_week || !$start_time || !$end_time) {
    echo json_encode(["status" => "error", "message" => "All fields including group_id are required"]);
    exit;
}

$group_condition = $group_id ? "group_id = '$group_id'" : "group_id IS NULL";

// Check for overlapping schedule
$checkQuery = "
SELECT schedule_id FROM class_schedules 
WHERE class_id = '$class_id' 
AND day_of_week = '$day_of_week'
AND $group_condition
AND (
    ('$start_time' BETWEEN start_time AND end_time) OR
    ('$end_time' BETWEEN start_time AND end_time) OR
    (start_time BETWEEN '$start_time' AND '$end_time')
)
";

$checkResult = mysqli_query($conn, $checkQuery);

if (mysqli_num_rows($checkResult) > 0) {
    echo json_encode(["status" => "error", "message" => "Schedule overlaps with existing schedule for this class and group"]);
    exit;
}

$room_value = $room_id ? "'$room_id'" : "NULL";
$semester_value = $semester ? "'$semester'" : "NULL";
$group_value = $group_id ? "'$group_id'" : "NULL";
$lecturer_value = $lecturer_id ? "'$lecturer_id'" : "NULL";
$grace_period_value = $grace_period ? "'$grace_period'" : "15";

$query = "INSERT INTO class_schedules (
    class_id, 
    group_id, 
    room_id, 
    lecturer_id,
    day_of_week, 
    start_time, 
    end_time, 
    device_id, 
    semester, 
    grace_period
) VALUES (
    '$class_id', 
    $group_value, 
    $room_value, 
    $lecturer_value,
    '$day_of_week', 
    '$start_time', 
    '$end_time', 
    '$device_id', 
    $semester_value, 
    $grace_period_value
)";

if (mysqli_query($conn, $query)) {
    $schedule_id = mysqli_insert_id($conn);
    echo json_encode([
        "status" => "success", 
        "schedule_id" => $schedule_id,
        "message" => "Schedule added successfully"
    ]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>