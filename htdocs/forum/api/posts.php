<?php
require 'db.php';

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    if (!empty($_GET['id'])) {
      // Fetch one post with its vote totals
      $s = $db->prepare('
        SELECT 
          p.id,
          p.thread_id,
          p.author_id,
          p.parent_post_id,
          p.content,
          p.created_at,
          p.is_edited,
          COALESCE(SUM(CASE WHEN v.vote =  1 THEN 1 ELSE 0 END),0) AS like_count,
          COALESCE(SUM(CASE WHEN v.vote = -1 THEN 1 ELSE 0 END),0) AS dislike_count
        FROM posts AS p
        LEFT JOIN post_votes AS v
          ON p.id = v.post_id
        WHERE p.id = :id
        GROUP BY p.id
      ');
      $s->execute([':id' => $_GET['id']]);
      echo json_encode($s->fetch(PDO::FETCH_ASSOC));
    } else {
      // Fetch all posts with their vote totals
      $s = $db->query('
        SELECT 
          p.id,
          p.thread_id,
          p.author_id,
          p.parent_post_id,
          p.content,
          p.created_at,
          p.is_edited,
          COALESCE(SUM(CASE WHEN v.vote =  1 THEN 1 ELSE 0 END),0) AS like_count,
          COALESCE(SUM(CASE WHEN v.vote = -1 THEN 1 ELSE 0 END),0) AS dislike_count
        FROM posts AS p
        LEFT JOIN post_votes AS v
          ON p.id = v.post_id
        GROUP BY p.id
        ORDER BY p.created_at ASC
      ');
      echo json_encode($s->fetchAll(PDO::FETCH_ASSOC));
    }
    break;

  case 'POST':
    $d = json_decode(file_get_contents('php://input'), true);
    foreach (['thread_id','author_id','content'] as $f) {
      if (empty($d[$f])) {
        http_response_code(422);
        echo json_encode(['error'=>"Missing field: $f"]);
        exit;
      }
    }
    $s = $db->prepare('
      INSERT INTO posts (thread_id, author_id, parent_post_id, content)
      VALUES (:t, :a, :p, :c)
    ');
    $s->execute([
      ':t' => $d['thread_id'],
      ':a' => $d['author_id'],
      ':p' => ($d['parent_post_id'] ?? null),
      ':c' => $d['content']
    ]);
    echo json_encode(['id' => $db->lastInsertId()]);
    break;

  case 'PUT':
    if (empty($_GET['id'])) { http_response_code(400); exit; }
    $d = json_decode(file_get_contents('php://input'), true);
    $fields = []; $p = [];
    foreach (['content','is_edited'] as $col) {
      if (isset($d[$col])) {
        $fields[]   = "$col = :$col";
        $p[":$col"] = $d[$col];
      }
    }
    if (empty($fields)) { http_response_code(422); exit; }
    $p[':id'] = $_GET['id'];
    $stmt = $db->prepare('UPDATE posts SET '.implode(', ', $fields).' WHERE id = :id');
    $stmt->execute($p);
    echo json_encode(['updated' => $stmt->rowCount()]);
    break;

  case 'DELETE':
    if (empty($_GET['id'])) { http_response_code(400); exit; }
    $s = $db->prepare('DELETE FROM posts WHERE id = :id');
    $s->execute([':id' => $_GET['id']]);
    echo json_encode(['deleted' => $s->rowCount()]);
    break;

  default:
    http_response_code(405);
    break;
}
