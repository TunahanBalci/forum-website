<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database connection
try {
    $db = new PDO('sqlite:' . __DIR__ . '/../data/forum.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA foreign_keys = ON;');
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed', 'details' => $e->getMessage()]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get and validate input
$rawInput = file_get_contents('php://input');
if (empty($rawInput)) {
    http_response_code(400);
    echo json_encode(['error' => 'No data received']);
    exit;
}

$input = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

// Validate required fields
$requiredFields = ['user_id', 'current_password', 'new_password'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || trim($input[$field]) === '') {
        http_response_code(422);
        echo json_encode(['error' => "Missing or empty field: $field"]);
        exit;
    }
}

$userId = intval($input['user_id']);
$currentPassword = trim($input['current_password']);
$newPassword = trim($input['new_password']);


if (strlen($newPassword) < 6) {
    http_response_code(422);
    echo json_encode(['error' => 'New password must be at least 6 characters long']);
    exit;
}

try {
    // Get current user data
    $stmt = $db->prepare('SELECT id, password_hash, nickname FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }
    
    // Verify current password
    if (!password_verify($currentPassword, $user['password_hash'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Current password is incorrect']);
        exit;
    }
    
    // Generate new password hash
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password in database
    $updateStmt = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $success = $updateStmt->execute([$newPasswordHash, $userId]);
    
    if ($success && $updateStmt->rowCount() > 0) {
        // Verify the update worked by checking the database
        $verifyStmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
        $verifyStmt->execute([$userId]);
        $updatedHash = $verifyStmt->fetchColumn();
        
        if ($updatedHash === $newPasswordHash) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Password updated successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Password update verification failed']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update password - no rows affected']);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'details' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}
?>