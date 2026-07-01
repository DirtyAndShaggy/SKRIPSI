<?php
include("../cors_headers.php");
include("../config/database.php");

$schedule_id = $_GET['schedule_id'] ?? null;
$date = $_GET['date'] ?? date("Y-m-d");
$date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : date("Y-m-d");

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

// ─── Get students assigned to this schedule (via schedule_students) ───
$studentQuery = "
SELECT 
    s.student_id,
    s.nim,
    s.name,
    s.semester,
    s.fingerprint_id
FROM schedule_students ss
JOIN students s ON ss.student_id = s.student_id
WHERE ss.schedule_id = '$schedule_id'
ORDER BY s.name ASC
";

$studentResult = mysqli_query($conn, $studentQuery);

// ─── If no students found via schedule_students, fallback to group ───
if (mysqli_num_rows($studentResult) === 0 && $group_id) {
    $studentQuery = "
    SELECT 
        s.student_id,
        s.nim,
        s.name,
        s.semester,
        s.fingerprint_id
    FROM students s
    WHERE s.group_id = '$group_id'
    ORDER BY s.name ASC
    ";
    $studentResult = mysqli_query($conn, $studentQuery);
}

// ─── Get attendance records for this schedule and date ───
$attendanceQuery = "
SELECT student_id, status, timestamp 
FROM attendance 
WHERE schedule_id = '$schedule_id' 
AND DATE(timestamp) = '$date'
";

$attendanceResult = mysqli_query($conn, $attendanceQuery);
$attendanceMap = [];
while ($row = mysqli_fetch_assoc($attendanceResult)) {
    $attendanceMap[$row['student_id']] = [
        'status' => $row['status'],
        'timestamp' => $row['timestamp']
    ];
}

$students = [];
while ($row = mysqli_fetch_assoc($studentResult)) {
    if (isset($attendanceMap[$row['student_id']])) {
        $row['status'] = $attendanceMap[$row['student_id']]['status'];
        $row['timestamp'] = $attendanceMap[$row['student_id']]['timestamp'];
    } else {
        $row['status'] = 'Absent';
        $row['timestamp'] = null;
    }
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