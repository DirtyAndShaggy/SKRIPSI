<?php
include("../cors_headers.php");
include("../config/database.php");

date_default_timezone_set('Asia/Jakarta');

$date = $_GET['date'] ?? date("Y-m-d");
$date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : date("Y-m-d");
$dayName = date('l', strtotime($date));

// ─── ALWAYS show attendance data, even for archived schedules ───
// No is_archived filter - we want ALL attendance data visible

$query = "
SELECT
    cs.schedule_id,
    cs.class_id,
    cs.group_id,
    cs.day_of_week,
    cs.start_time,
    cs.end_time,
    cs.semester AS schedule_semester,
    cs.lecturer_id,
    cs.is_archived,
    cs.is_cancelled,
    c.class_code,
    c.class_name,
    l.full_name AS lecturer_name,
    g.group_name,
    g.group_code,
    r.room_code,
    r.room_name,
    ss.student_id,
    s.nim,
    s.name AS student_name,
    s.semester AS student_semester,
    s.fingerprint_id,
    COALESCE(a.status, 'Absent') AS status,
    a.timestamp,
    a.device_id,
    a.sync_status
FROM schedule_students ss
JOIN class_schedules cs ON ss.schedule_id = cs.schedule_id
JOIN classes c ON cs.class_id = c.class_id
LEFT JOIN lecturers l ON cs.lecturer_id = l.lecturer_id
LEFT JOIN `groups` g ON cs.group_id = g.group_id
LEFT JOIN rooms r ON cs.room_id = r.room_id
JOIN students s ON ss.student_id = s.student_id
LEFT JOIN attendance a ON a.student_id = ss.student_id
    AND a.schedule_id = ss.schedule_id
    AND DATE(a.timestamp) = '$date'
ORDER BY c.class_name ASC, g.group_name ASC, s.name ASC
";

$result = mysqli_query($conn, $query);
if (!$result) {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    exit;
}

$records = [];
$present_count = 0;
$late_count = 0;
$absent_count = 0;

while ($row = mysqli_fetch_assoc($result)) {
    $records[] = $row;
    if ($row['status'] === 'Present') $present_count++;
    elseif ($row['status'] === 'Late') $late_count++;
    else $absent_count++;
}

$total = count($records);
$attendance_rate = $total > 0 ? round((($present_count + $late_count) / $total) * 100, 1) : 0;

echo json_encode([
    "status" => "success",
    "date" => $date,
    "day_of_week" => $dayName,
    "summary" => [
        "total" => $total,
        "present" => $present_count,
        "late" => $late_count,
        "absent" => $absent_count,
        "attendance_rate" => $attendance_rate
    ],
    "records" => $records
]);

mysqli_close($conn);
?>