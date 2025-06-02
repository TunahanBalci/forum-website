<?php
require 'db.php';

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    if (!empty($_GET['id'])) {
      $stmt = $db->prepare('
        SELECT id, fullname, nickname, email, image_path, bio, birthdate, created_at, post_count, is_admin
        FROM users
        WHERE id = ?
      ');
      $stmt->execute([$_GET['id']]);
      $result = $stmt->fetch(PDO::FETCH_ASSOC);
      
      if (!$result) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
      }
      
      echo json_encode($result);
    } else {
      $stmt = $db->query('
        SELECT id, fullname, nickname, email, image_path, bio, birthdate, created_at, post_count, is_admin
        FROM users
        ORDER BY created_at DESC
      ');
      echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    break;

  case 'POST':
    $data = json_decode(file_get_contents('php://input'), true);
    // required: fullname, nickname, email, password_hash, birthdate
    foreach (['fullname','nickname','email','password_hash','birthdate'] as $f) {
      if (empty($data[$f])) {
        http_response_code(422);
        echo json_encode(['error'=>"Missing field: $f"]);
        exit;
      }
    }
    
    try {
      $stmt = $db->prepare('
        INSERT INTO users (fullname, nickname, email, password_hash, birthdate)
        VALUES (?, ?, ?, ?, ?)
      ');
      $stmt->execute([
        $data['fullname'],
        $data['nickname'],
        $data['email'],
        $data['password_hash'],
        $data['birthdate']
      ]);
      echo json_encode(['id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
      if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'Nickname or email already in use']);
      } else {
        http_response_code(500);
        echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
      }
    }
    break;

  case 'PUT':
    if (empty($_GET['id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'User ID required']);
      exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $fields = [];
    $params = [];
    
    if (isset($data['password_change'])) {
      if (empty($data['current_password']) || empty($data['new_password'])) {
        http_response_code(422);
        echo json_encode(['error' => 'Current password and new password required']);
        exit;
      }
      
      // Get current user to verify password
      $verifyStmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
      $verifyStmt->execute([$_GET['id']]);
      $currentHash = $verifyStmt->fetchColumn();
      
      if (!$currentHash || !password_verify($data['current_password'], $currentHash)) {
        http_response_code(400);
        echo json_encode(['error' => 'Current password is incorrect']);
        exit;
      }
      
      // Update password
      $newHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
      $fields[] = "password_hash = ?";
      $params[] = $newHash;
      
    } else {
      if (isset($data['password_hash'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Use password_change flag to change passwords']);
        exit;
      }
      
      $allowedFields = ['fullname', 'nickname', 'email', 'image_path', 'bio', 'birthdate', 'post_count', 'is_admin'];
      
      foreach ($allowedFields as $col) {
        if (isset($data[$col])) {
          $fields[] = "$col = ?";
          $params[] = $data[$col];
        }
      }
    }
    
    if (empty($fields)) {
      http_response_code(422);
      echo json_encode(['error' => 'No valid fields to update']);
      exit;
    }
    
    $params[] = $_GET['id']; 
    $sql = 'UPDATE users SET '.implode(', ', $fields).' WHERE id = ?';
    
    try {
      $stmt = $db->prepare($sql);
      $stmt->execute($params);
      echo json_encode(['updated' => $stmt->rowCount()]);
    } catch (PDOException $e) {
      if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'Nickname or email already in use']);
      } else {
        http_response_code(500);
        echo json_encode(['error' => 'Update failed', 'details' => $e->getMessage()]);
      }
    }
    break;

  case 'DELETE':
    if (empty($_GET['id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'User ID required']);
      exit;
    }
    
    $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$_GET['id']]);
    echo json_encode(['deleted' => $stmt->rowCount()]);
    break;

  default:
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    break;
}