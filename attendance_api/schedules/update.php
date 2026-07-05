<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$schedule_id = $data['schedule_id'] ?? 0;
$class_id = $data['class_id'] ?? 0;
$group_id = $data['group_id'] ?? null;
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

$group_condition = $group_id ? "group_id = '$group_id'" : "group_id IS NULL";

// Check for overlapping schedule (excluding current schedule)
$checkQuery = "
SELECT schedule_id FROM class_schedules 
WHERE class_id = '$class_id' 
AND day_of_week = '$day_of_week'
AND schedule_id != '$schedule_id'
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
$grace_period = isset($data['grace_period']) ? intval($data['grace_period']) : 15;
$grace_period_value = "'$grace_period'";
$room_value = $room_id ? "'$room_id'" : "NULL";
$semester_value = $semester ? "'$semester'" : "NULL";
$group_value = $group_id ? "'$group_id'" : "NULL";

$query = "UPDATE class_schedules SET 
          class_id = '$class_id',
          group_id = $group_value,
          room_id = $room_value,
          day_of_week = '$day_of_week',
          start_time = '$start_time',
          end_time = '$end_time',
          device_id = '$device_id',
          semester = $semester_value,
          grace_period = $grace_period_value
          WHERE schedule_id = '$schedule_id'";

if (mysqli_query($conn, $query)) {
    $timezone = new DateTimeZone('Asia/Jakarta');
    $todayDate = date('Y-m-d');
    $scheduleStart = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', "$todayDate $start_time", $timezone);
    $lateThreshold = $scheduleStart->modify("+$grace_period minutes");

    $attendanceQuery = "
        SELECT attendance_id, timestamp
        FROM attendance
        WHERE schedule_id = '$schedule_id'
        AND DATE(timestamp) = '$todayDate'
        AND status IN ('Present', 'Late')
    ";
    $attendanceResult = mysqli_query($conn, $attendanceQuery);

    while ($attendanceRow = mysqli_fetch_assoc($attendanceResult)) {
        $attendanceTime = new DateTime($attendanceRow['timestamp'], $timezone);
        $newStatus = ($attendanceTime > $lateThreshold) ? 'Late' : 'Present';
        $attendanceId = $attendanceRow['attendance_id'];

        mysqli_query($conn, "UPDATE attendance SET status = '$newStatus' WHERE attendance_id = '$attendanceId'");
    }

    echo json_encode(["status" => "success", "message" => "Schedule updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>