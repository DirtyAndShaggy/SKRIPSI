<?php
include("../cors_headers.php");
include("../config/database.php");

$class_id = $_GET['class_id'] ?? null;
$semester = $_GET['semester'] ?? null;

$where = [];
if ($class_id) {
    $where[] = "cs.class_id = '$class_id'";
}
if ($semester) {
    $where[] = "cs.semester = '$semester'";
}
$whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

$query = "
SELECT 
    cs.schedule_id,
    cs.class_id,
    cs.room_id,
    cs.day_of_week,
    cs.start_time,
    cs.end_time,
    cs.device_id,
    cs.semester,
    cs.grace_period,
    c.class_code,
    c.class_name,
    c.lecturer_id,
    l.full_name as lecturer_name,
    r.room_code,
    r.room_name,
    r.building,
    (SELECT COUNT(*) FROM schedule_students ss WHERE ss.schedule_id = cs.schedule_id) as student_count
FROM class_schedules cs
JOIN classes c ON cs.class_id = c.class_id
LEFT JOIN lecturers l ON c.lecturer_id = l.lecturer_id
LEFT JOIN rooms r ON cs.room_id = r.room_id
$whereClause
ORDER BY FIELD(cs.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), cs.start_time
";

$result = mysqli_query($conn, $query);

$schedules = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Get students for this schedule
    $studentQuery = "
    SELECT s.student_id, s.nim, s.name, s.semester, s.academic_year, s.fingerprint_id
    FROM schedule_students ss
    JOIN students s ON ss.student_id = s.student_id
    WHERE ss.schedule_id = '{$row['schedule_id']}'
    ORDER BY s.name ASC
    ";
    $studentResult = mysqli_query($conn, $studentQuery);
    $students = [];
    while ($student = mysqli_fetch_assoc($studentResult)) {
        $students[] = $student;
    }
    $row['students'] = $students;
    $schedules[] = $row;
}

echo json_encode(["status" => "success", "schedules" => $schedules]);
mysqli_close($conn);
?>