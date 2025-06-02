<?php
require 'db.php';
session_start();
header('Content-Type: application/json');


$method = $_SERVER['REQUEST_METHOD'];
switch ($method) {
  case 'GET':
    $today  = date('Y-m-d');
    $userId = $_SESSION['user_id'] ?? null;

    if (!empty($_GET['id'])) {
      $tid = (int)$_GET['id'];

      // if logged in & first view today, record it + bump total
      if ($userId) {
        $chk = $db->prepare('
          SELECT 1 FROM thread_views
           WHERE user_id=:u AND thread_id=:t AND view_date=:d
        ');
        $chk->execute([':u'=>$userId,':t'=>$tid,':d'=>$today]);
        if (!$chk->fetch()) {
          $db->prepare('
            INSERT INTO thread_views (user_id, thread_id, view_date)
            VALUES (:u,:t,:d)
          ')->execute([':u'=>$userId,':t'=>$tid,':d'=>$today]);

          $db->prepare('
            UPDATE threads
            SET click_count_total = click_count_total + 1
            WHERE id = :t
          ')->execute([':t'=>$tid]);
        }
      }

      // fetch one thread + all counts + votes
      $stmt = $db->prepare('
        SELECT 
          t.*,
          -- distinct daily/weekly/monthly from thread_views:
          (SELECT COUNT(*) FROM thread_views
             WHERE thread_id = t.id AND view_date = :today
          ) AS click_count_daily,
          (SELECT COUNT(*) FROM thread_views
             WHERE thread_id = t.id 
               AND view_date >= date(:today,"-6 days")
          ) AS click_count_weekly,
          (SELECT COUNT(*) FROM thread_views
             WHERE thread_id = t.id 
               AND view_date >= date(:today,"-29 days")
          ) AS click_count_monthly,
          -- vote totals
          COALESCE(tv.likes,0)    AS like_count,
          COALESCE(tv.dislikes,0) AS dislike_count
        FROM threads AS t
        LEFT JOIN (
          SELECT thread_id,
                 SUM(vote=1)  AS likes,
                 SUM(vote=-1) AS dislikes
          FROM thread_votes
          GROUP BY thread_id
        ) AS tv ON t.id = tv.thread_id
        WHERE t.id = :t
      ');
      $stmt->execute([':t'=>$tid,':today'=>$today]);
      echo json_encode($stmt->fetch(PDO::FETCH_ASSOC) ?: []);
      exit;
    }

    // thread list no ?id
    $threads = $db->prepare('
      SELECT 
        t.*,
        -- same sub-queries for each thread in the list:
        (SELECT COUNT(*) FROM thread_views
           WHERE thread_id = t.id AND view_date = :today
        ) AS click_count_daily,
        (SELECT COUNT(*) FROM thread_views
           WHERE thread_id = t.id 
             AND view_date >= date(:today,"-6 days")
        ) AS click_count_weekly,
        (SELECT COUNT(*) FROM thread_views
           WHERE thread_id = t.id 
             AND view_date >= date(:today,"-29 days")
        ) AS click_count_monthly,
        COALESCE(tv.likes,0)    AS like_count,
        COALESCE(tv.dislikes,0) AS dislike_count
      FROM threads AS t
      LEFT JOIN (
        SELECT thread_id,
               SUM(vote=1)  AS likes,
               SUM(vote=-1) AS dislikes
        FROM thread_votes
        GROUP BY thread_id
      ) AS tv ON t.id = tv.thread_id
      ORDER BY t.created_at DESC
    ');
    $threads->execute([':today'=>$today]);
    echo json_encode($threads->fetchAll(PDO::FETCH_ASSOC));
    exit;

  case 'POST':
    $d = json_decode(file_get_contents('php://input'), true);

    foreach (['author_id','category_id','title','content'] as $f) {
      if (empty($d[$f])) {
        http_response_code(422);
        echo json_encode(['error'=>"Missing field: $f"]);
        exit;
      }
    }

    $stmt = $db->prepare('
      INSERT INTO threads (author_id, category_id, title, content)
      VALUES (:a, :cat, :t, :c)
    ');
    $stmt->execute([
      ':a'   => $d['author_id'],
      ':cat' => $d['category_id'],
      ':t'   => $d['title'],
      ':c'   => $d['content']
    ]);

    echo json_encode(['id' => $db->lastInsertId()]);
    break;

  case 'PUT':
    if (empty($_GET['id'])) { http_response_code(400); exit; }
    $d = json_decode(file_get_contents('php://input'), true);
    $fields = []; $p = [];
    foreach (['title','content','is_edited'] as $col) {
      if (isset($d[$col])) {
        $fields[]   = "$col = :$col";
        $p[":$col"] = $d[$col];
      }
    }
    if (empty($fields)) { http_response_code(422); exit; }
    $p[':id'] = $_GET['id'];
    $stmt = $db->prepare('UPDATE threads SET '.implode(', ', $fields).' WHERE id = :id');
    $stmt->execute($p);
    echo json_encode(['updated' => $stmt->rowCount()]);
    break;

  case 'DELETE':
    if (empty($_GET['id'])) { http_response_code(400); exit; }
    $stmt = $db->prepare('DELETE FROM threads WHERE id = :id');
    $stmt->execute([':id' => $_GET['id']]);
    echo json_encode(['deleted' => $stmt->rowCount()]);
    break;

  default:
    http_response_code(405);
    break;
}
