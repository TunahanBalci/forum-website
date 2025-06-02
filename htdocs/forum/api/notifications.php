<?php
require 'db.php';

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    if (isset($_GET['user_id'])) {
      $sql = '
        SELECT 
          n.id, 
          n.user_id, 
          n.actor_id, 
          n.type, 
          n.entity_type, 
          n.entity_id, 
          n.is_read, 
          n.created_at,
          u.nickname as actor_name,
          u.image_path as actor_image
        FROM notifications n
        LEFT JOIN users u ON n.actor_id = u.id
        WHERE n.user_id = :u
      ';
      $params = [':u' => $_GET['user_id']];
      if (isset($_GET['is_read'])) {
        $sql .= ' AND n.is_read = :r';
        $params[':r'] = $_GET['is_read'];
      }
      $sql .= ' ORDER BY n.created_at DESC';
      
      $s = $db->prepare($sql);
      $s->execute($params);
      echo json_encode($s->fetchAll(PDO::FETCH_ASSOC));
    } else {
      $s = $db->query('
        SELECT 
          n.id, 
          n.user_id, 
          n.actor_id, 
          n.type, 
          n.entity_type, 
          n.entity_id, 
          n.is_read, 
          n.created_at,
          u.nickname as actor_name,
          u.image_path as actor_image
        FROM notifications n
        LEFT JOIN users u ON n.actor_id = u.id
        ORDER BY n.created_at DESC
      ');
      echo json_encode($s->fetchAll(PDO::FETCH_ASSOC));
    }
    break;

  case 'PUT':
    if (empty($_GET['id']) || !isset($_GET['is_read'])) {
      http_response_code(400);
      exit;
    }
    $s = $db->prepare('
      UPDATE notifications
      SET is_read = :r
      WHERE id = :id
    ');
    $s->execute([':r' => $_GET['is_read'], ':id' => $_GET['id']]);
    echo json_encode(['updated' => $s->rowCount()]);
    break;

  case 'DELETE':
    if (empty($_GET['id'])) {
      http_response_code(400);
      echo json_encode(['error' => 'Notification ID required']);
      exit;
    }
    
    $s = $db->prepare('
      DELETE FROM notifications
      WHERE id = :id
    ');
    $s->execute([':id' => $_GET['id']]);
    echo json_encode(['deleted' => $s->rowCount()]);
    break;

  default:
    http_response_code(405);
    break;
}