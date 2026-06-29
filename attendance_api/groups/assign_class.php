<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_id = $data['class_id'] ?? 0;
$group_ids = $data['group_ids'] ?? [];
$semester = $data['semester'] ?? null;

if (!$class_id) {
    echo json_encode(["status" => "error", "message" => "Class ID required"]);
    exit;
}

// Remove existing assignments
$deleteQuery = "DELETE FROM group_classes WHERE class_id = '$class_id'";
mysqli_query($conn, $deleteQuery);

// Add new assignments
if (!empty($group_ids) && is_array($group_ids)) {
    $semester_value = $semester ? "'$semester'" : "NULL";
    foreach ($group_ids as $group_id) {
        $insertQuery = "INSERT INTO group_classes (group_id, class_id, semester) 
                        VALUES ('$group_id', '$class_id', $semester_value)";
        mysqli_query($conn, $insertQuery);
    }
}

echo json_encode(["status" => "success", "message" => "Groups assigned to class successfully"]);
mysqli_close($conn);
?>