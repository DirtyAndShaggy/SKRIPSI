<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$schedule_id = $data['schedule_id'] ?? 0;
$user_id = $data['user_id'] ?? 0;

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "Schedule ID required"]);
    exit;
}

// ─── Check permission ───
$userQuery = "SELECT lecturer_id FROM lecturers WHERE user_id = '$user_id'";
$userResult = mysqli_query($conn, $userQuery);
if (!$userResult || mysqli_num_rows($userResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Lecturer not found"]);
    exit;
}
$lecturer = mysqli_fetch_assoc($userResult);
$lecturer_id = $lecturer['lecturer_id'];

// ─── Get schedule ───
$scheduleQuery = "SELECT * FROM class_schedules WHERE schedule_id = '$schedule_id'";
$scheduleResult = mysqli_query($conn, $scheduleQuery);
if (!$scheduleResult || mysqli_num_rows($scheduleResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Schedule not found"]);
    exit;
}
$schedule = mysqli_fetch_assoc($scheduleResult);

// ─── Verify lecturer owns this schedule ───
if ($schedule['lecturer_id'] != $lecturer_id) {
    echo json_encode(["status" => "error", "message" => "You do not have permission to cancel this schedule"]);
    exit;
}

// ─── Check if already cancelled ───
if ($schedule['is_cancelled'] == 1) {
    echo json_encode(["status" => "error", "message" => "This class is already cancelled"]);
    exit;
}

// ─── Check if this is a postponed copy (has original_schedule_id) ───
$isPostponedCopy = $schedule['original_schedule_id'] ? true : false;

// ─── Cancel the schedule ───
$updateQuery = "
    UPDATE class_schedules 
    SET is_cancelled = 1, 
        cancelled_date = CURDATE(),
        modified_by = '$user_id',
        modified_at = NOW()
    WHERE schedule_id = '$schedule_id'
";

if (mysqli_query($conn, $updateQuery)) {
    $message = $isPostponedCopy 
        ? "Postponed class cancelled successfully" 
        : "Class cancelled successfully";
    
    echo json_encode([
        "status" => "success",
        "message" => $message,
        "schedule_id" => $schedule_id,
        "is_postponed_copy" => $isPostponedCopy
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to cancel class: " . mysqli_error($conn)]);
}

mysqli_close($conn);
?>