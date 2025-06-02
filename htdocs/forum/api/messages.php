<?php
require 'db.php';

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    if (!empty($_GET['id'])) {
      // Get single message
      $s = $db->prepare('
        SELECT id, sender_id, receiver_id, content, status, created_at, is_edited
        FROM messages
        WHERE id = :id
      ');
      $s->execute([':id' => $_GET['id']]);
      echo json_encode($s->fetch(PDO::FETCH_ASSOC));
    } elseif (!empty($_GET['thread_with'])) {
      // Get conversation between current user and another user
      session_start();
      $currentUserId = $_SESSION['user_id'] ?? null;
      $otherUserId = $_GET['thread_with'];
      
      if (!$currentUserId) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
      }
      
      $s = $db->prepare('
        SELECT id, sender_id, receiver_id, content, status, created_at, is_edited
        FROM messages
        WHERE (sender_id = :current AND receiver_id = :other)
           OR (sender_id = :other AND receiver_id = :current)
        ORDER BY created_at ASC
      ');
      $s->execute([
        ':current' => $currentUserId,
        ':other' => $otherUserId
      ]);
      echo json_encode($s->fetchAll(PDO::FETCH_ASSOC));
    } else {
      // Get all messages
      $s = $db->query('
        SELECT id, sender_id, receiver_id, content, status, created_at, is_edited
        FROM messages
        ORDER BY created_at DESC
      ');
      echo json_encode($s->fetchAll(PDO::FETCH_ASSOC));
    }
    break;

  case 'POST':
    $d = json_decode(file_get_contents('php://input'), true);
    foreach (['sender_id','receiver_id','content'] as $f) {
      if (empty($d[$f])) {
        http_response_code(422);
        echo json_encode(['error'=>"Missing field: $f"]);
        exit;
      }
    }
    $st = $d['status'] ?? 'sent';
    $s = $db->prepare('
      INSERT INTO messages (sender_id, receiver_id, content, status)
      VALUES (:s, :r, :c, :status)
    ');
    $s->execute([
      ':s'      => $d['sender_id'],
      ':r'      => $d['receiver_id'],
      ':c'      => $d['content'],
      ':status' => $st
    ]);
    echo json_encode(['id' => $db->lastInsertId()]);
    break;

  case 'PUT':
    if (empty($_GET['id'])) { http_response_code(400); exit; }
    $d = json_decode(file_get_contents('php://input'), true);
    $fields = []; $p = [];
    foreach (['status','content','is_edited'] as $col) {
      if (isset($d[$col])) {
        $fields[]   = "$col = :$col";
        $p[":$col"] = $d[$col];
      }
    }
    if (empty($fields)) { http_response_code(422); exit; }
    $p[':id'] = $_GET['id'];
    $stmt = $db->prepare('UPDATE messages SET '.implode(', ', $fields).' WHERE id = :id');
    $stmt->execute($p);
    echo json_encode(['updated' => $stmt->rowCount()]);
    break;

  case 'DELETE':
    if (empty($_GET['id'])) { http_response_code(400); exit; }
    $s = $db->prepare('DELETE FROM messages WHERE id = :id');
    $s->execute([':id' => $_GET['id']]);
    echo json_encode(['deleted' => $s->rowCount()]);
    break;

  default:
    http_response_code(405);
    break;
}