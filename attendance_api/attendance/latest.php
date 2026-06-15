<?php

header("Content-Type: application/json");
include("../config/database.php");

$sql = "
SELECT 
    a.attendance_id,
    s.name,
    s.nim,
    c.class_name,
    a.timestamp,
    a.status
FROM attendance a
JOIN students s ON a.student_id = s.student_id
JOIN classes c ON a.class_id = c.class_id
ORDER BY a.timestamp DESC
LIMIT 20
";

$result = $conn->query($sql);

$data = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
}

echo json_encode($data);

$conn->close();

?>