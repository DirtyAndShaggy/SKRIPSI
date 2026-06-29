<?php
include("../cors_headers.php");
include("../config/database.php");

$class_id = $_GET['class_id'] ?? 0;

// Get all active groups
$query = "
SELECT 
    g.group_id,
    g.group_name,
    g.group_code,
    g.semester as current_semester,
    c.cohort_name,
    c.cohort_code,
    (SELECT COUNT(*) FROM students s WHERE s.group_id = g.group_id) as student_count,
    CASE 
        WHEN gc.class_id IS NOT NULL THEN 1 
        ELSE 0 
    END as is_assigned
FROM `groups` g
JOIN cohorts c ON g.cohort_id = c.cohort_id
LEFT JOIN group_classes gc ON g.group_id = gc.group_id AND gc.class_id = '$class_id' AND gc.is_active = 1
WHERE g.is_active = 1
ORDER BY c.cohort_name, g.group_name
";

$result = mysqli_query($conn, $query);

$groups = [];
while ($row = mysqli_fetch_assoc($result)) {
    $groups[] = $row;
}

echo json_encode(["status" => "success", "groups" => $groups]);
mysqli_close($conn);
?>