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
    echo json_encode(["status" => "error", "message" => "You do not have permission to restore this schedule"]);
    exit;
}

// ─── Check if this schedule has a postponed copy ───
$postponedCopyId = $schedule['postponed_to_schedule_id'] ?? null;

// ─── Start transaction ───
mysqli_begin_transaction($conn);

try {
    // ─── 1. Restore the original schedule ───
    $updateQuery = "
        UPDATE class_schedules 
        SET is_cancelled = 0, 
            cancelled_date = NULL,
            postponed_to_schedule_id = NULL,
            modified_by = '$user_id',
            modified_at = NOW()
        WHERE schedule_id = '$schedule_id'
    ";
    
    if (!mysqli_query($conn, $updateQuery)) {
        throw new Exception("Failed to restore schedule: " . mysqli_error($conn));
    }
    
    // ─── 2. Archive the postponed copy ───
    if ($postponedCopyId) {
        // Check if the copy exists
        $checkCopy = "SELECT schedule_id FROM class_schedules WHERE schedule_id = '$postponedCopyId'";
        $copyResult = mysqli_query($conn, $checkCopy);
        
        if (mysqli_num_rows($copyResult) > 0) {
            // Archive the copy
            $archiveCopy = "
                UPDATE class_schedules 
                SET is_archived = 1,
                    is_cancelled = 0,
                    archived_at = NOW(),
                    modified_by = '$user_id',
                    modified_at = NOW()
                WHERE schedule_id = '$postponedCopyId'
            ";
            if (!mysqli_query($conn, $archiveCopy)) {
                throw new Exception("Failed to archive postponed copy: " . mysqli_error($conn));
            }
        } else {
            // If the copy doesn't exist, just log it
            error_log("Restore: Postponed copy ID $postponedCopyId not found, skipping.");
        }
    }
    
    // ─── 3. Commit transaction ───
    mysqli_commit($conn);
    
    echo json_encode([
        "status" => "success",
        "message" => "Class restored successfully. Postponed copy archived.",
        "schedule_id" => $schedule_id,
        "archived_copy" => $postponedCopyId ? true : false
    ]);
    
} catch (Exception $e) {
    mysqli_rollback($conn);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

mysqli_close($conn);
?>