<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "
SELECT 
    s.student_id,
    s.nim,
    s.name,
    s.email,
    s.semester,
    s.academic_year,
    s.fingerprint_id,
    s.cohort_id,
    s.group_id,
    c.cohort_name,
    c.cohort_code,
    c.start_year,
    g.group_name,
    g.group_code,
    g.semester as group_semester,
    g.academic_year as group_academic_year,
    s.created_at
FROM students s
LEFT JOIN cohorts c ON s.cohort_id = c.cohort_id
LEFT JOIN `groups` g ON s.group_id = g.group_id
ORDER BY s.student_id DESC
";

$result = mysqli_query($conn, $query);

$students = [];
while ($row = mysqli_fetch_assoc($result)) {
    $students[] = $row;
}

echo json_encode(["status" => "success", "students" => $students]);
mysqli_close($conn);
?>