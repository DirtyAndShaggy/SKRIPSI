<?php
include("../cors_headers.php");
include("../config/database.php");

// Get schedule_id from GET or POST
$schedule_id = $_GET['schedule_id'] ?? $_POST['schedule_id'] ?? 0;
$semester_filter = $_GET['semester'] ?? $_POST['semester'] ?? null;

// Debug logging
error_log("get_students.php - schedule_id: $schedule_id");

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "schedule_id required"]);
    exit;
}

// Get schedule info
$scheduleQuery = "SELECT class_id, semester FROM class_schedules WHERE schedule_id = '$schedule_id'";
$scheduleResult = mysqli_query($conn, $scheduleQuery);

if (!$scheduleResult || mysqli_num_rows($scheduleResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Schedule not found"]);
    exit;
}

$schedule = mysqli_fetch_assoc($scheduleResult);

// Get students already assigned to this schedule
$assignedQuery = "SELECT student_id FROM schedule_students WHERE schedule_id = '$schedule_id'";
$assignedResult = mysqli_query($conn, $assignedQuery);
$assignedIds = [];
while ($row = mysqli_fetch_assoc($assignedResult)) {
    $assignedIds[] = $row['student_id'];
}

// Get all active students (check if is_active column exists first)
// Try with is_active, fallback without
$semesterFilter = $semester_filter ? "AND s.semester = '$semester_filter'" : "";

// First try with is_active column
$studentQuery = "
SELECT s.student_id, s.nim, s.name, s.semester, s.academic_year, s.fingerprint_id,
       s.cohort_id, s.group_id,
       c.cohort_name, c.cohort_code,
       g.group_name, g.group_code
FROM students s
LEFT JOIN cohorts c ON s.cohort_id = c.cohort_id
LEFT JOIN `groups` g ON s.group_id = g.group_id
WHERE 1=1
$semesterFilter
ORDER BY s.name ASC
";

// If is_active column doesn't exist, this will still work
$studentResult = mysqli_query($conn, $studentQuery);

$students = [];
while ($row = mysqli_fetch_assoc($studentResult)) {
    $row['is_assigned'] = in_array($row['student_id'], $assignedIds);
    $students[] = $row;
}

echo json_encode([
    "status" => "success",
    "schedule_id" => $schedule_id,
    "class_id" => $schedule['class_id'],
    "semester" => $schedule['semester'],
    "students" => $students
]);

mysqli_close($conn);
?>