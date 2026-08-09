<?php
/**
 * Debug script to check attendance data structure
 * Run: php debug_attendance.php
 */

require_once __DIR__ . '/config/database.php';

echo "=== ATTENDANCE DATA DEBUG ===\n\n";

// 1. Check attendance records
echo "1. ATTENDANCE RECORDS:\n";
$query = "SELECT COUNT(*) as count, MIN(DATE(timestamp)) as earliest, MAX(DATE(timestamp)) as latest FROM attendance";
$result = mysqli_query($conn, $query);
$row = mysqli_fetch_assoc($result);
echo "  Total records: {$row['count']}\n";
echo "  Date range: {$row['earliest']} to {$row['latest']}\n\n";

// 2. Check what statuses exist
echo "2. ATTENDANCE STATUSES:\n";
$query = "SELECT status, COUNT(*) as count FROM attendance GROUP BY status";
$result = mysqli_query($conn, $query);
while ($row = mysqli_fetch_assoc($result)) {
    echo "  {$row['status']}: {$row['count']} records\n";
}
echo "\n";

// 3. Check schedule_students
echo "3. SCHEDULE_STUDENTS:\n";
$query = "SELECT COUNT(*) as count FROM schedule_students";
$result = mysqli_query($conn, $query);
$row = mysqli_fetch_assoc($result);
echo "  Total assignments: {$row['count']}\n\n";

// 4. Check if the attendance records are linked to schedule_students
echo "4. ATTENDANCE WITH SCHEDULE_STUDENTS:\n";
$query = "
    SELECT 
        COUNT(DISTINCT a.student_id) as students_with_attendance,
        COUNT(DISTINCT ss.student_id) as students_with_schedule
    FROM attendance a
    LEFT JOIN schedule_students ss ON a.student_id = ss.student_id AND a.schedule_id = ss.schedule_id
";
$result = mysqli_query($conn, $query);
$row = mysqli_fetch_assoc($result);
echo "  Students with attendance: {$row['students_with_attendance']}\n";
echo "  Students with schedule assignments: {$row['students_with_schedule']}\n\n";

// 5. Check a sample student with attendance
echo "5. SAMPLE STUDENT WITH ATTENDANCE:\n";
$query = "
    SELECT 
        s.student_id,
        s.nim,
        s.name,
        s.email,
        COUNT(a.attendance_id) as attendance_count,
        GROUP_CONCAT(DISTINCT a.status) as statuses
    FROM students s
    JOIN attendance a ON s.student_id = a.student_id
    GROUP BY s.student_id
    LIMIT 1
";
$result = mysqli_query($conn, $query);
if ($row = mysqli_fetch_assoc($result)) {
    echo "  Student: {$row['name']} (NIM: {$row['nim']})\n";
    echo "  Student ID: {$row['student_id']}\n";
    echo "  Attendance records: {$row['attendance_count']}\n";
    echo "  Statuses: {$row['statuses']}\n";
    
    // Check if this student has schedule_students assignments
    $checkQuery = "
        SELECT COUNT(*) as count 
        FROM schedule_students 
        WHERE student_id = '{$row['student_id']}'
    ";
    $checkResult = mysqli_query($conn, $checkQuery);
    $checkRow = mysqli_fetch_assoc($checkResult);
    echo "  Schedule assignments: {$checkRow['count']}\n";
}
echo "\n";

// 6. Check if schedule_students has the right schedule_ids
echo "6. SCHEDULE_IDS IN ATTENDANCE VS SCHEDULE_STUDENTS:\n";
$query = "
    SELECT 
        COUNT(DISTINCT a.schedule_id) as attendance_schedules,
        COUNT(DISTINCT ss.schedule_id) as schedule_students_schedules
    FROM attendance a
    LEFT JOIN schedule_students ss ON a.schedule_id = ss.schedule_id
";
$result = mysqli_query($conn, $query);
$row = mysqli_fetch_assoc($result);
echo "  Unique schedule IDs in attendance: {$row['attendance_schedules']}\n";
echo "  Unique schedule IDs in schedule_students: {$row['schedule_students_schedules']}\n\n";

// 7. Check actual absence count for a student
echo "7. ABSENCE CALCULATION FOR A SPECIFIC STUDENT:\n";
$query = "
    SELECT 
        s.student_id,
        s.name,
        s.nim,
        COUNT(DISTINCT ss.schedule_id) as total_schedules,
        COUNT(DISTINCT a.attendance_id) as attended_count,
        (COUNT(DISTINCT ss.schedule_id) - COUNT(DISTINCT a.attendance_id)) as absent_count
    FROM students s
    JOIN schedule_students ss ON s.student_id = ss.student_id
    JOIN class_schedules cs ON ss.schedule_id = cs.schedule_id
    LEFT JOIN attendance a ON s.student_id = a.student_id 
        AND a.schedule_id = ss.schedule_id
        AND a.status IN ('Present', 'Late')
    GROUP BY s.student_id
    HAVING absent_count > 0
    LIMIT 5
";
$result = mysqli_query($conn, $query);
if (mysqli_num_rows($result) > 0) {
    while ($row = mysqli_fetch_assoc($result)) {
        echo "  {$row['name']} (NIM: {$row['nim']}): {$row['absent_count']} absences out of {$row['total_schedules']} schedules\n";
    }
} else {
    echo "  No students with absences found!\n";
    echo "  This means either:\n";
    echo "  - All students have attendance for all their schedules\n";
    echo "  - Or schedule_students doesn't match attendance records\n";
}
echo "\n";

// 8. Check if any student has no attendance for their schedules
echo "8. STUDENTS WITH SCHEDULE ASSIGNMENTS BUT NO ATTENDANCE:\n";
$query = "
    SELECT 
        s.student_id,
        s.name,
        s.nim,
        COUNT(DISTINCT ss.schedule_id) as assigned_schedules,
        COUNT(DISTINCT a.attendance_id) as attendance_records
    FROM students s
    JOIN schedule_students ss ON s.student_id = ss.student_id
    LEFT JOIN attendance a ON s.student_id = a.student_id 
        AND a.schedule_id = ss.schedule_id
    GROUP BY s.student_id
    HAVING attendance_records = 0
    LIMIT 5
";
$result = mysqli_query($conn, $query);
if (mysqli_num_rows($result) > 0) {
    while ($row = mysqli_fetch_assoc($result)) {
        echo "  {$row['name']} (NIM: {$row['nim']}): {$row['assigned_schedules']} schedules, 0 attendance records\n";
    }
} else {
    echo "  All students have at least 1 attendance record for their schedules\n";
}
echo "\n";

// 9. Check class_schedules status
echo "9. CLASS_SCHEDULES STATUS:\n";
$query = "SELECT is_archived, COUNT(*) as count FROM class_schedules GROUP BY is_archived";
$result = mysqli_query($conn, $query);
while ($row = mysqli_fetch_assoc($result)) {
    echo "  is_archived = {$row['is_archived']}: {$row['count']} schedules\n";
}
echo "\n";

// 10. Check if the schedule from July 6 is archived
echo "10. JULY 6 SCHEDULE STATUS:\n";
$query = "
    SELECT 
        cs.schedule_id,
        cs.class_id,
        c.class_name,
        cs.day_of_week,
        cs.start_time,
        cs.is_archived,
        (SELECT COUNT(*) FROM schedule_students WHERE schedule_id = cs.schedule_id) as student_count
    FROM class_schedules cs
    JOIN classes c ON cs.class_id = c.class_id
    WHERE cs.schedule_id IN (SELECT DISTINCT schedule_id FROM attendance WHERE DATE(timestamp) = '2026-07-06')
";
$result = mysqli_query($conn, $query);
while ($row = mysqli_fetch_assoc($result)) {
    echo "  Schedule ID: {$row['schedule_id']}\n";
    echo "  Class: {$row['class_name']}\n";
    echo "  Day: {$row['day_of_week']} {$row['start_time']}\n";
    echo "  is_archived: {$row['is_archived']}\n";
    echo "  Students: {$row['student_count']}\n\n";
}

mysqli_close($conn);
echo "=== DEBUG COMPLETE ===\n";
?>