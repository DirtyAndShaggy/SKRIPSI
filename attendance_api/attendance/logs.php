<?php
include("../cors_headers.php");
include("../config/database.php");

$limit = $_GET['limit'] ?? 100;

$query = "
SELECT 
    al.log_id,
    al.device_id,
    al.fingerprint_id,
    al.student_id,
    al.event_type,
    al.message,
    al.created_at,
    s.name as student_name,
    s.nim,
    c.class_name,
    g.group_name
FROM attendance_logs al
LEFT JOIN students s ON al.student_id = s.student_id
LEFT JOIN class_schedules cs ON al.schedule_id = cs.schedule_id
LEFT JOIN classes c ON cs.class_id = c.class_id
LEFT JOIN `groups` g ON cs.group_id = g.group_id
ORDER BY al.created_at DESC
LIMIT $limit
";

$result = mysqli_query($conn, $query);

$logs = [];
while ($row = mysqli_fetch_assoc($result)) {
    $logs[] = $row;
}

echo json_encode(["status" => "success", "logs" => $logs]);
mysqli_close($conn);
?>