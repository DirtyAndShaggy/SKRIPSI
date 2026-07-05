<?php
include("../cors_headers.php");
include("../config/database.php");

$schedule_id = $_GET['schedule_id'] ?? null;
$date = $_GET['date'] ?? date("Y-m-d");
$date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : date("Y-m-d");
$dayName = date('l', strtotime($date));

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "schedule_id required"]);
    exit;
}

// Get schedule info with class and group
$scheduleQuery = "
SELECT 
    cs.schedule_id,
    cs.class_id,
    cs.group_id,
    cs.start_time,
    cs.end_time,
    cs.day_of_week,
    cs.grace_period,
    c.class_code,
    c.class_name,
    g.group_name,
    g.group_code
FROM class_schedules cs
JOIN classes c ON cs.class_id = c.class_id
LEFT JOIN `groups` g ON cs.group_id = g.group_id
WHERE cs.schedule_id = '$schedule_id'
";

$scheduleResult = mysqli_query($conn, $scheduleQuery);

if (!$scheduleResult || mysqli_num_rows($scheduleResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Schedule not found"]);
    exit;
}

$schedule = mysqli_fetch_assoc($scheduleResult);
$class_id = $schedule['class_id'];
$group_id = $schedule['group_id'];

if ($schedule['day_of_week'] !== $dayName) {
    echo json_encode([
        "status" => "success",
        "schedule" => $schedule,
        "date" => $date,
        "debug" => [
            "group_id" => $group_id,
            "student_count" => 0,
            "attendance_count" => 0
        ],
        "summary" => [
            "total_students" => 0,
            "present" => 0,
            "late" => 0,
            "absent" => 0,
            "attendance_rate" => 0
        ],
        "students" => []
    ]);
    mysqli_close($conn);
    exit;
}

// ─── Get attendance records for this schedule and date only ───
$attendanceQuery = "
SELECT 
    a.student_id,
    s.nim,
    s.name,
    s.semester,
    s.fingerprint_id,
    a.status,
    a.timestamp,
    a.device_id,
    a.sync_status
FROM attendance a
JOIN students s ON a.student_id = s.student_id
WHERE a.schedule_id = '$schedule_id'
AND DATE(a.timestamp) = '$date'
ORDER BY s.name ASC
";

$attendanceResult = mysqli_query($conn, $attendanceQuery);
$students = [];
while ($row = mysqli_fetch_assoc($attendanceResult)) {
    $students[] = $row;
}

// Calculate summary
$present_count = 0;
$late_count = 0;
$absent_count = 0;

foreach ($students as $student) {
    if ($student['status'] === 'Present') $present_count++;
    elseif ($student['status'] === 'Late') $late_count++;
    else $absent_count++;
}

$total_students = count($students);
$attendance_rate = $total_students > 0 ? round(($present_count + $late_count) / $total_students * 100, 1) : 0;

echo json_encode([
    "status" => "success",
    "schedule" => $schedule,
    "date" => $date,
    "debug" => [
        "group_id" => $group_id,
        "student_count" => $total_students,
        "attendance_count" => count($attendanceMap)
    ],
    "summary" => [
        "total_students" => $total_students,
        "present" => $present_count,
        "late" => $late_count,
        "absent" => $absent_count,
        "attendance_rate" => $attendance_rate
    ],
    "students" => $students
]);

mysqli_close($conn);
?>