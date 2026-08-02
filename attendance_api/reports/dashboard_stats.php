<?php
include("../cors_headers.php");
include("../config/database.php");

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

$user_id = $_GET['user_id'] ?? 0;
$period = $_GET['period'] ?? 'week';
$role = $_GET['role'] ?? 'admin';

// Get lecturer_id if user is a lecturer
$lecturer_id = null;
$classIds = [];
$classIdList = '';

if ($role === 'lecturer' && $user_id) {
    $lecturerQuery = "SELECT lecturer_id FROM lecturers WHERE user_id = '$user_id'";
    $lecturerResult = mysqli_query($conn, $lecturerQuery);
    if ($lecturerRow = mysqli_fetch_assoc($lecturerResult)) {
        $lecturer_id = $lecturerRow['lecturer_id'];
    }
}

// ─── 1. TOTAL COUNTS ───
$totalStudents = 0;
$totalClasses = 0;
$totalGroups = 0;
$totalCohorts = 0;
$totalSchedules = 0;
$todayPresent = 0;
$todayLate = 0;
$todayAbsent = 0;

try {
    if ($role === 'admin') {
        // Admin: All data
        $studentCount = mysqli_query($conn, "SELECT COUNT(*) as count FROM students");
        if ($studentCount && $row = mysqli_fetch_assoc($studentCount)) {
            $totalStudents = (int)$row['count'];
        }
        
        $classCount = mysqli_query($conn, "SELECT COUNT(*) as count FROM classes");
        if ($classCount && $row = mysqli_fetch_assoc($classCount)) {
            $totalClasses = (int)$row['count'];
        }
        
        $groupCount = mysqli_query($conn, "SELECT COUNT(*) as count FROM `groups`");
        if ($groupCount && $row = mysqli_fetch_assoc($groupCount)) {
            $totalGroups = (int)$row['count'];
        }
        
        $cohortCount = mysqli_query($conn, "SELECT COUNT(*) as count FROM cohorts");
        if ($cohortCount && $row = mysqli_fetch_assoc($cohortCount)) {
            $totalCohorts = (int)$row['count'];
        }
        
        $scheduleCount = mysqli_query($conn, "SELECT COUNT(*) as count FROM class_schedules WHERE is_archived = 0");
        if ($scheduleCount && $row = mysqli_fetch_assoc($scheduleCount)) {
            $totalSchedules = (int)$row['count'];
        }
        
        // Today's attendance - INCLUDE ALL attendance regardless of archived status
        $todayDate = date('Y-m-d');
        $todayQuery = "
            SELECT 
                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
            FROM attendance
            WHERE DATE(timestamp) = '$todayDate'
        ";
        $todayResult = mysqli_query($conn, $todayQuery);
        if ($todayResult && $row = mysqli_fetch_assoc($todayResult)) {
            $todayPresent = (int)($row['present'] ?? 0);
            $todayLate = (int)($row['late'] ?? 0);
            $todayAbsent = (int)($row['absent'] ?? 0);
        }
        
    } else {
        // ─── LECTURER: Filtered by schedules ───
        if ($lecturer_id) {
            // ─── GET CLASSES TAUGHT BY THIS LECTURER (VIA SCHEDULES) ───
            $classQuery = "
                SELECT DISTINCT c.class_id 
                FROM classes c
                JOIN class_schedules cs ON c.class_id = cs.class_id
                WHERE cs.lecturer_id = '$lecturer_id'
                AND c.is_active = 1
            ";
            $classResult = mysqli_query($conn, $classQuery);
            
            while ($row = mysqli_fetch_assoc($classResult)) {
                $classIds[] = $row['class_id'];
            }
            
            if (!empty($classIds)) {
                $classIdList = implode(',', $classIds);
                
                // Students
                $studentQuery = "
                    SELECT COUNT(DISTINCT s.student_id) as count
                    FROM students s
                    JOIN `groups` g ON s.group_id = g.group_id
                    JOIN group_classes gc ON g.group_id = gc.group_id
                    WHERE gc.class_id IN ($classIdList)
                    AND gc.is_active = 1
                ";
                $studentResult = mysqli_query($conn, $studentQuery);
                if ($studentResult && $row = mysqli_fetch_assoc($studentResult)) {
                    $totalStudents = (int)$row['count'];
                }
                
                // Classes
                $totalClasses = count($classIds);
                
                // Groups
                $groupQuery = "
                    SELECT COUNT(DISTINCT g.group_id) as count
                    FROM `groups` g
                    JOIN group_classes gc ON g.group_id = gc.group_id
                    WHERE gc.class_id IN ($classIdList)
                    AND gc.is_active = 1
                ";
                $groupResult = mysqli_query($conn, $groupQuery);
                if ($groupResult && $row = mysqli_fetch_assoc($groupResult)) {
                    $totalGroups = (int)$row['count'];
                }
                
                // Cohorts
                $cohortQuery = "
                    SELECT COUNT(DISTINCT g.cohort_id) as count
                    FROM `groups` g
                    JOIN group_classes gc ON g.group_id = gc.group_id
                    WHERE gc.class_id IN ($classIdList)
                    AND gc.is_active = 1
                ";
                $cohortResult = mysqli_query($conn, $cohortQuery);
                if ($cohortResult && $row = mysqli_fetch_assoc($cohortResult)) {
                    $totalCohorts = (int)$row['count'];
                }
                
                // Schedules (only non-archived for the count)
                $scheduleQuery = "
                    SELECT COUNT(*) as count
                    FROM class_schedules cs
                    WHERE cs.class_id IN ($classIdList)
                    AND cs.lecturer_id = '$lecturer_id'
                    AND cs.is_archived = 0
                ";
                $scheduleResult = mysqli_query($conn, $scheduleQuery);
                if ($scheduleResult && $row = mysqli_fetch_assoc($scheduleResult)) {
                    $totalSchedules = (int)$row['count'];
                }
                
                // Today's attendance - INCLUDE ALL attendance regardless of archived status
                $todayDate = date('Y-m-d');
                $todayQuery = "
                    SELECT 
                        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
                        SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late,
                        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
                    FROM attendance a
                    JOIN class_schedules cs ON a.schedule_id = cs.schedule_id
                    WHERE cs.class_id IN ($classIdList)
                    AND cs.lecturer_id = '$lecturer_id'
                    AND DATE(a.timestamp) = '$todayDate'
                ";
                $todayResult = mysqli_query($conn, $todayQuery);
                if ($todayResult && $row = mysqli_fetch_assoc($todayResult)) {
                    $todayPresent = (int)($row['present'] ?? 0);
                    $todayLate = (int)($row['late'] ?? 0);
                    $todayAbsent = (int)($row['absent'] ?? 0);
                }
            }
        }
    }
} catch (Exception $e) {
    error_log("Dashboard stats error: " . $e->getMessage());
}

// ─── 2. ATTENDANCE TREND ───
$trendData = [];
$dateRange = $period === 'week' ? 7 : 30;

try {
    for ($i = $dateRange - 1; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $dateLabel = date('M d', strtotime($date));
        
        if ($role === 'lecturer' && $lecturer_id && !empty($classIds)) {
            $trendQuery = "
                SELECT 
                    SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late,
                    SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
                FROM attendance a
                JOIN class_schedules cs ON a.schedule_id = cs.schedule_id
                WHERE cs.class_id IN ($classIdList)
                AND cs.lecturer_id = '$lecturer_id'
                AND DATE(a.timestamp) = '$date'
            ";
        } else {
            $trendQuery = "
                SELECT 
                    SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late,
                    SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent
                FROM attendance
                WHERE DATE(timestamp) = '$date'
            ";
        }
        
        $trendResult = mysqli_query($conn, $trendQuery);
        if ($trendResult && $row = mysqli_fetch_assoc($trendResult)) {
            $trendData[] = [
                'date' => $dateLabel,
                'present' => (int)($row['present'] ?? 0),
                'late' => (int)($row['late'] ?? 0),
                'absent' => (int)($row['absent'] ?? 0)
            ];
        } else {
            $trendData[] = [
                'date' => $dateLabel,
                'present' => 0,
                'late' => 0,
                'absent' => 0
            ];
        }
    }
} catch (Exception $e) {
    error_log("Trend data error: " . $e->getMessage());
}

// ─── 3. CLASS COMPARISON ───
$classComparison = [];
try {
    $classQuery = "
        SELECT 
            c.class_id,
            c.class_code,
            c.class_name,
            COUNT(DISTINCT a.attendance_id) as total_attendance,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
            SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late_count,
            ROUND(
                CASE 
                    WHEN COUNT(DISTINCT a.attendance_id) > 0 
                    THEN (SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) / COUNT(DISTINCT a.attendance_id)) * 100 
                    ELSE 0 
                END, 1
            ) as attendance_rate
        FROM classes c
        LEFT JOIN class_schedules cs ON c.class_id = cs.class_id
        LEFT JOIN attendance a ON cs.schedule_id = a.schedule_id
    ";

    if ($role === 'lecturer' && $lecturer_id && !empty($classIds)) {
        $classQuery .= " WHERE c.class_id IN ($classIdList)";
    }

    $classQuery .= " GROUP BY c.class_id ORDER BY attendance_rate DESC LIMIT 10";

    $classResult = mysqli_query($conn, $classQuery);
    if ($classResult) {
        while ($row = mysqli_fetch_assoc($classResult)) {
            $classComparison[] = $row;
        }
    }
} catch (Exception $e) {
    error_log("Class comparison error: " . $e->getMessage());
}

// ─── 4. RECENT ACTIVITY ───
$recentActivity = [];
try {
    $activityQuery = "
        SELECT 
            a.attendance_id,
            a.status,
            a.timestamp,
            s.name as student_name,
            s.nim,
            c.class_code,
            c.class_name,
            l.full_name as lecturer_name
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        JOIN class_schedules cs ON a.schedule_id = cs.schedule_id
        JOIN classes c ON cs.class_id = c.class_id
        LEFT JOIN lecturers l ON cs.lecturer_id = l.lecturer_id
    ";

    if ($role === 'lecturer' && $lecturer_id && !empty($classIds)) {
        $activityQuery .= " WHERE cs.class_id IN ($classIdList)";
    }

    $activityQuery .= " ORDER BY a.timestamp DESC LIMIT 20";

    $activityResult = mysqli_query($conn, $activityQuery);
    if ($activityResult) {
        while ($row = mysqli_fetch_assoc($activityResult)) {
            $recentActivity[] = $row;
        }
    }
} catch (Exception $e) {
    error_log("Recent activity error: " . $e->getMessage());
}

// ─── RESPONSE ───
echo json_encode([
    "status" => "success",
    "role" => $role,
    "period" => $period,
    "summary" => [
        "total_students" => (int)$totalStudents,
        "total_classes" => (int)$totalClasses,
        "total_groups" => (int)$totalGroups,
        "total_cohorts" => (int)$totalCohorts,
        "total_schedules" => (int)$totalSchedules,
        "today_present" => (int)$todayPresent,
        "today_late" => (int)$todayLate,
        "today_absent" => (int)$todayAbsent,
        "today_total" => (int)($todayPresent + $todayLate + $todayAbsent),
        "today_rate" => ($todayPresent + $todayLate + $todayAbsent) > 0 ? round(($todayPresent + $todayLate) / ($todayPresent + $todayLate + $todayAbsent) * 100, 1) : 0
    ],
    "trend" => $trendData,
    "class_comparison" => $classComparison,
    "recent_activity" => $recentActivity
]);

mysqli_close($conn);
?>