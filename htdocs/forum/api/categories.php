<?php
require 'db.php';

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    if (!empty($_GET['id'])) {
      $stmt = $db->prepare('
        SELECT id, name
        FROM categories
        WHERE id = :id
      ');
      $stmt->execute([':id' => $_GET['id']]);
      echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    } else {
      $stmt = $db->query('
        SELECT id, name
        FROM categories
        ORDER BY name
      ');
      echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    break;

  case 'POST':
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['name'])) {
      http_response_code(422);
      echo json_encode(['error' => 'Category name is required']);
      exit;
    }
    
    $stmt = $db->prepare('
      INSERT INTO categories (name)
      VALUES (:name)
    ');
    $stmt->execute([':name' => $data['name']]);
    echo json_encode(['id' => $db->lastInsertId()]);
    break;

  case 'PUT':
    if (empty($_GET['id'])) {
      http_response_code(400);
      exit;
    }
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['name'])) {
      http_response_code(422);
      exit;
    }
    
    $stmt = $db->prepare('
      UPDATE categories
      SET name = :name
      WHERE id = :id
    ');
    $stmt->execute([
      ':name' => $data['name'],
      ':id' => $_GET['id']
    ]);
    echo json_encode(['updated' => $stmt->rowCount()]);
    break;

  case 'DELETE':
    if (empty($_GET['id'])) {
      http_response_code(400);
      exit;
    }
    $stmt = $db->prepare('DELETE FROM categories WHERE id = :id');
    $stmt->execute([':id' => $_GET['id']]);
    echo json_encode(['deleted' => $stmt->rowCount()]);
    break;

  default:
    http_response_code(405);
    break;
}