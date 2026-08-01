<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

require_once __DIR__ . '/../config/database.php';

$limit = $_GET['limit'] ?? 50;
$user_id = $_GET['user_id'] ?? 0;
$role = $_GET['role'] ?? 'lecturer';

// ─── Get lecturer_id (if lecturer) ───
$lecturer_id = null;
if ($role === 'lecturer' && $user_id) {
    $lecturerQuery = "SELECT lecturer_id FROM lecturers WHERE user_id = '$user_id'";
    $lecturerResult = mysqli_query($conn, $lecturerQuery);
    if ($lecturerRow = mysqli_fetch_assoc($lecturerResult)) {
        $lecturer_id = $lecturerRow['lecturer_id'];
    }
}

$classFilter = "";
if ($lecturer_id) {
    // Lecturer: filter by schedules they teach
    $classFilter = "AND cs.lecturer_id = '$lecturer_id'";
}

// ─── Create table if it doesn't exist ───
$createTable = "
CREATE TABLE IF NOT EXISTS `attendance_notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `class_id` INT NOT NULL,
    `absence_count` INT NOT NULL,
    `attendance_percentage` DECIMAL(5,2) DEFAULT NULL,
    `notification_date` DATE NOT NULL,
    `status` ENUM('sent', 'failed', 'pending') DEFAULT 'sent',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE,
    INDEX `idx_student_class` (`student_id`, `class_id`),
    INDEX `idx_notification_date` (`notification_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
";
mysqli_query($conn, $createTable);

$query = "
    SELECT 
        n.*,
        s.name AS student_name,
        s.nim,
        c.class_code,
        c.class_name,
        l.full_name AS lecturer_name,
        cs.schedule_id
    FROM attendance_notifications n
    JOIN students s ON n.student_id = s.student_id
    JOIN classes c ON n.class_id = c.class_id
    LEFT JOIN class_schedules cs ON c.class_id = cs.class_id
    LEFT JOIN lecturers l ON cs.lecturer_id = l.lecturer_id
    WHERE 1=1
    $classFilter
    ORDER BY n.created_at DESC
    LIMIT $limit
";

$result = mysqli_query($conn, $query);

if (!$result) {
    echo json_encode(['status' => 'error', 'message' => mysqli_error($conn)]);
    exit;
}

$history = [];
while ($row = mysqli_fetch_assoc($result)) {
    $history[] = $row;
}

echo json_encode([
    'status' => 'success',
    'history' => $history,
    'count' => count($history)
]);

mysqli_close($conn);
?>