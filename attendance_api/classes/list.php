<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "
SELECT 
    c.*,
    (SELECT COUNT(*) FROM student_classes sc WHERE sc.class_id = c.class_id AND sc.is_active = 1) as student_count
FROM classes c
ORDER BY c.class_id DESC
";
$result = mysqli_query($conn, $query);

$classes = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Get rooms for this class
    $roomQuery = "SELECT r.room_id, r.room_code, r.room_name, r.building 
                  FROM class_rooms cr 
                  JOIN rooms r ON cr.room_id = r.room_id 
                  WHERE cr.class_id = '{$row['class_id']}'";
    $roomResult = mysqli_query($conn, $roomQuery);
    $rooms = [];
    while ($room = mysqli_fetch_assoc($roomResult)) {
        $rooms[] = $room;
    }
    $row['rooms'] = $rooms;
    
    // ─── GET GROUPS ASSIGNED TO THIS CLASS ───
    $groupQuery = "
    SELECT 
        gc.group_id,
        gc.class_id,
        g.group_name,
        g.group_code,
        g.cohort_id,
        cg.cohort_name,
        cg.cohort_code
    FROM group_classes gc
    JOIN `groups` g ON gc.group_id = g.group_id
    JOIN cohorts cg ON g.cohort_id = cg.cohort_id
    WHERE gc.class_id = '{$row['class_id']}' AND gc.is_active = 1
    ORDER BY cg.cohort_name, g.group_name
    ";
    $groupResult = mysqli_query($conn, $groupQuery);
    $assignedGroups = [];
    while ($group = mysqli_fetch_assoc($groupResult)) {
        $assignedGroups[] = $group;
    }
    $row['assigned_groups'] = $assignedGroups;
    
    $classes[] = $row;
}

echo json_encode(["status" => "success", "classes" => $classes]);
mysqli_close($conn);
?>