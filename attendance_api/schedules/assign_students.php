<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$schedule_id = $data['schedule_id'] ?? 0;
$student_ids = $data['student_ids'] ?? [];

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "schedule_id required"]);
    exit;
}

// Verify schedule exists
$checkSchedule = "SELECT schedule_id FROM class_schedules WHERE schedule_id = '$schedule_id'";
$checkResult = mysqli_query($conn, $checkSchedule);

if (mysqli_num_rows($checkResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Schedule not found"]);
    exit;
}

// Remove all existing assignments for this schedule
$deleteQuery = "DELETE FROM schedule_students WHERE schedule_id = '$schedule_id'";
mysqli_query($conn, $deleteQuery);

// Add new assignments
$assigned_count = 0;
if (!empty($student_ids) && is_array($student_ids)) {
    foreach ($student_ids as $student_id) {
        $student_id = intval($student_id);
        if ($student_id > 0) {
            $insertQuery = "INSERT INTO schedule_students (schedule_id, student_id) VALUES ('$schedule_id', '$student_id')";
            if (mysqli_query($conn, $insertQuery)) {
                $assigned_count++;
            }
        }
    }
}

echo json_encode([
    "status" => "success",
    "message" => "Students assigned successfully",
    "assigned_count" => $assigned_count
]);

mysqli_close($conn);
?>