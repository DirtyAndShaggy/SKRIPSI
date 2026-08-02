<?php
include("../cors_headers.php");
include("../config/database.php");

$class_id = $_GET['class_id'] ?? null;
$semester = $_GET['semester'] ?? null;
$show_archived = $_GET['show_archived'] ?? 'true'; // Changed: default show archived

// ─── STEP 1: AUTO-RESTORE ORIGINAL SCHEDULES ───
// When a postponed class date has passed, restore the original automatically
$autoRestoreQuery = "
    UPDATE class_schedules 
    SET is_cancelled = 0, 
        cancelled_date = NULL,
        postponed_to_schedule_id = NULL,
        modified_by = 0,
        modified_at = NOW()
    WHERE is_cancelled = 1 
    AND postponed_to_schedule_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM class_schedules copy 
        WHERE copy.schedule_id = class_schedules.postponed_to_schedule_id
        AND copy.postponed_to_date < CURDATE()
    )
";
mysqli_query($conn, $autoRestoreQuery);

// ─── STEP 2: AUTO-ARCHIVE POSTPONED COPIES ───
// When a postponed class date has passed, archive the copy
$autoArchiveQuery = "
    UPDATE class_schedules 
    SET is_archived = 1,
        archived_at = NOW(),
        modified_by = 0,
        modified_at = NOW()
    WHERE is_archived = 0
    AND original_schedule_id IS NOT NULL
    AND postponed_to_date < CURDATE()
";
mysqli_query($conn, $autoArchiveQuery);

// ─── STEP 3: BUILD QUERY ───
$where = [];
if ($class_id) {
    $where[] = "cs.class_id = '$class_id'";
}
if ($semester) {
    $where[] = "cs.semester = '$semester'";
}

// ─── Show archived by default (for attendance reporting) ───
if ($show_archived !== 'false') {
    // Show all schedules including archived
} else {
    $where[] = "cs.is_archived = 0";
}

$whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

$query = "
SELECT 
    cs.schedule_id,
    cs.class_id,
    cs.group_id,
    cs.room_id,
    cs.day_of_week,
    cs.start_time,
    cs.end_time,
    cs.device_id,
    cs.semester,
    cs.grace_period,
    cs.lecturer_id,
    cs.is_cancelled,
    cs.cancelled_date,
    cs.postponed_to_schedule_id,
    cs.original_schedule_id,
    cs.is_archived,
    cs.archived_at,
    c.class_code,
    c.class_name,
    l.full_name as lecturer_name,
    l.lecturer_code as lecturer_code,
    r.room_code,
    r.room_name,
    r.building,
    g.group_name,
    g.group_code as group_code,
    g.cohort_id,
    co.cohort_name,
    co.cohort_code as cohort_code,
    (SELECT COUNT(*) FROM schedule_students ss WHERE ss.schedule_id = cs.schedule_id) as student_count
FROM class_schedules cs
JOIN classes c ON cs.class_id = c.class_id
LEFT JOIN lecturers l ON cs.lecturer_id = l.lecturer_id
LEFT JOIN rooms r ON cs.room_id = r.room_id
LEFT JOIN `groups` g ON cs.group_id = g.group_id
LEFT JOIN cohorts co ON g.cohort_id = co.cohort_id
$whereClause
ORDER BY FIELD(cs.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), cs.start_time
";

$result = mysqli_query($conn, $query);

$schedules = [];
while ($row = mysqli_fetch_assoc($result)) {
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