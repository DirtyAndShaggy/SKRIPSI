<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$schedule_id = $data['schedule_id'] ?? 0;
$postpone_date = $data['postpone_date'] ?? null;
$postpone_schedule_id = $data['postpone_schedule_id'] ?? null;
$user_id = $data['user_id'] ?? 0;

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "Schedule ID required"]);
    exit;
}

if (!$postpone_date && !$postpone_schedule_id) {
    echo json_encode(["status" => "error", "message" => "Postpone date or schedule required"]);
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

// ─── Get original schedule ───
$scheduleQuery = "SELECT * FROM class_schedules WHERE schedule_id = '$schedule_id'";
$scheduleResult = mysqli_query($conn, $scheduleQuery);
if (!$scheduleResult || mysqli_num_rows($scheduleResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Schedule not found"]);
    exit;
}
$originalSchedule = mysqli_fetch_assoc($scheduleResult);

// ─── Verify lecturer owns this schedule ───
if ($originalSchedule['lecturer_id'] != $lecturer_id) {
    echo json_encode(["status" => "error", "message" => "You do not have permission to modify this schedule"]);
    exit;
}

// ─── Check if schedule is already cancelled ───
if ($originalSchedule['is_cancelled'] == 1) {
    echo json_encode(["status" => "error", "message" => "Cannot postpone a cancelled class. Please restore it first."]);
    exit;
}

// ─── Check if this schedule is already a postponed copy ───
if ($originalSchedule['original_schedule_id']) {
    echo json_encode(["status" => "error", "message" => "This schedule is already a postponed copy. Please restore the original first."]);
    exit;
}

// ─── Date validation: only allow within 7 days ───
if ($postpone_date) {
    $today = new DateTime();
    $today->setTime(0, 0, 0);
    
    $maxDate = clone $today;
    $maxDate->modify('+7 days');
    
    $postponeDateTime = new DateTime($postpone_date);
    $postponeDateTime->setTime(0, 0, 0);
    
    if ($postponeDateTime < $today) {
        echo json_encode(["status" => "error", "message" => "Cannot postpone to a past date"]);
        exit;
    }
    
    if ($postponeDateTime > $maxDate) {
        echo json_encode(["status" => "error", "message" => "Can only postpone within 7 days of the original date"]);
        exit;
    }
}

// ─── Handle postponement ───
if ($postpone_schedule_id) {
    // Postpone to existing schedule on another day
    $targetQuery = "SELECT * FROM class_schedules WHERE schedule_id = '$postpone_schedule_id' AND lecturer_id = '$lecturer_id'";
    $targetResult = mysqli_query($conn, $targetQuery);
    if (!$targetResult || mysqli_num_rows($targetResult) === 0) {
        echo json_encode(["status" => "error", "message" => "Target schedule not found or not owned by you"]);
        exit;
    }
    $targetSchedule = mysqli_fetch_assoc($targetResult);
    
    if ($targetSchedule['is_cancelled'] == 1) {
        echo json_encode(["status" => "error", "message" => "Target schedule is cancelled"]);
        exit;
    }
    
    // Create a postponed session
    $postponeQuery = "
        INSERT INTO class_schedules (
            class_id, group_id, room_id, day_of_week, start_time, end_time,
            device_id, semester, grace_period, lecturer_id, is_cancelled, is_archived,
            original_schedule_id, postponed_to_date, modified_by, modified_at
        ) VALUES (
            '{$originalSchedule['class_id']}',
            '{$originalSchedule['group_id']}',
            '{$originalSchedule['room_id']}',
            '{$targetSchedule['day_of_week']}',
            '{$targetSchedule['start_time']}',
            '{$targetSchedule['end_time']}',
            '{$originalSchedule['device_id']}',
            '{$originalSchedule['semester']}',
            '{$originalSchedule['grace_period']}',
            '$lecturer_id',
            0,
            0,
            '$schedule_id',
            NOW(),
            '$user_id',
            NOW()
        )
    ";
    
    if (!mysqli_query($conn, $postponeQuery)) {
        echo json_encode(["status" => "error", "message" => "Failed to create postponed schedule: " . mysqli_error($conn)]);
        exit;
    }
    $newScheduleId = mysqli_insert_id($conn);
    
    $updateQuery = "
        UPDATE class_schedules 
        SET is_cancelled = 1, 
            cancelled_date = CURDATE(),
            postponed_to_schedule_id = '$newScheduleId',
            modified_by = '$user_id',
            modified_at = NOW()
        WHERE schedule_id = '$schedule_id'
    ";
    
    if (mysqli_query($conn, $updateQuery)) {
        echo json_encode([
            "status" => "success",
            "message" => "Class postponed successfully",
            "original_schedule_id" => $schedule_id,
            "new_schedule_id" => $newScheduleId,
            "postponed_to" => $targetSchedule['day_of_week'] . ' ' . $targetSchedule['start_time'] . '-' . $targetSchedule['end_time']
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to update original schedule"]);
    }
    
} else {
    // Postpone to a specific date
    $dayOfWeek = date('l', strtotime($postpone_date));
    
    $conflictQuery = "
        SELECT schedule_id FROM class_schedules 
        WHERE class_id = '{$originalSchedule['class_id']}' 
        AND day_of_week = '$dayOfWeek'
        AND start_time = '{$originalSchedule['start_time']}'
        AND end_time = '{$originalSchedule['end_time']}'
        AND is_cancelled = 0
        AND is_archived = 0
        AND schedule_id != '$schedule_id'
    ";
    $conflictResult = mysqli_query($conn, $conflictQuery);
    
    if (mysqli_num_rows($conflictResult) > 0) {
        echo json_encode([
            "status" => "error",
            "message" => "There is already an active schedule on $dayOfWeek at this time. Please choose a different date."
        ]);
        exit;
    }
    
    $postponeQuery = "
        INSERT INTO class_schedules (
            class_id, group_id, room_id, day_of_week, start_time, end_time,
            device_id, semester, grace_period, lecturer_id, is_cancelled, is_archived,
            original_schedule_id, postponed_to_date, modified_by, modified_at
        ) VALUES (
            '{$originalSchedule['class_id']}',
            '{$originalSchedule['group_id']}',
            '{$originalSchedule['room_id']}',
            '$dayOfWeek',
            '{$originalSchedule['start_time']}',
            '{$originalSchedule['end_time']}',
            '{$originalSchedule['device_id']}',
            '{$originalSchedule['semester']}',
            '{$originalSchedule['grace_period']}',
            '$lecturer_id',
            0,
            0,
            '$schedule_id',
            '$postpone_date',
            '$user_id',
            NOW()
        )
    ";
    
    if (!mysqli_query($conn, $postponeQuery)) {
        echo json_encode(["status" => "error", "message" => "Failed to create postponed schedule: " . mysqli_error($conn)]);
        exit;
    }
    $newScheduleId = mysqli_insert_id($conn);
    
    $updateQuery = "
        UPDATE class_schedules 
        SET is_cancelled = 1, 
            cancelled_date = CURDATE(),
            postponed_to_schedule_id = '$newScheduleId',
            modified_by = '$user_id',
            modified_at = NOW()
        WHERE schedule_id = '$schedule_id'
    ";
    
    if (mysqli_query($conn, $updateQuery)) {
        echo json_encode([
            "status" => "success",
            "message" => "Class postponed successfully to $postpone_date",
            "original_schedule_id" => $schedule_id,
            "new_schedule_id" => $newScheduleId,
            "postponed_to_date" => $postpone_date
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to update original schedule"]);
    }
}

mysqli_close($conn);
?>