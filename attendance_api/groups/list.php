<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "
SELECT 
    c.cohort_id,
    c.cohort_name,
    c.cohort_code,
    c.start_year,
    c.is_active,
    COUNT(g.group_id) as group_count,
    (SELECT COUNT(*) FROM students s WHERE s.cohort_id = c.cohort_id) as student_count
FROM cohorts c
LEFT JOIN `groups` g ON c.cohort_id = g.cohort_id AND g.is_active = 1
GROUP BY c.cohort_id
ORDER BY c.start_year DESC
";

$result = mysqli_query($conn, $query);

$cohorts = [];
while ($row = mysqli_fetch_assoc($result)) {
    $groupQuery = "
    SELECT 
        g.group_id,
        g.group_name,
        g.group_code,
        g.semester,
        g.academic_year,
        g.capacity,
        g.is_active,
        (SELECT COUNT(*) FROM students s WHERE s.group_id = g.group_id) as student_count
    FROM `groups` g
    WHERE g.cohort_id = '{$row['cohort_id']}' AND g.is_active = 1
    ORDER BY g.group_name
    ";
    $groupResult = mysqli_query($conn, $groupQuery);
    $groups = [];
    while ($group = mysqli_fetch_assoc($groupResult)) {
        $groups[] = $group;
    }
    $row['groups'] = $groups;
    $cohorts[] = $row;
}

echo json_encode(["status" => "success", "cohorts" => $cohorts]);
mysqli_close($conn);
?>