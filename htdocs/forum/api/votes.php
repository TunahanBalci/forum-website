<?php
require 'db.php';
session_start();

// must be logged in
$user = $_SESSION['user_id'] ?? null;
if (!$user || $_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(401);
  exit;
}

$data     = json_decode(file_get_contents('php://input'), true);
$postId   = isset($data['post_id'])   ? (int)$data['post_id']   : null;
$threadId = isset($data['thread_id']) ? (int)$data['thread_id'] : null;
$vote     = isset($data['vote'])      ? (int)$data['vote']      : null;

// validate vote value
if (!in_array($vote, [1, -1], true)) {
  http_response_code(422);
  echo json_encode(['error' => 'Invalid vote value']);
  exit;
}

if ($threadId) {
  $sql = <<<SQL
INSERT INTO thread_votes (user_id, thread_id, vote)
VALUES (:u, :t, :v)
ON CONFLICT(user_id, thread_id) DO UPDATE SET
  vote = excluded.vote
SQL;
  $stmt = $db->prepare($sql);
  $stmt->execute([
    ':u' => $user,
    ':t' => $threadId,
    ':v' => $vote
  ]);

  // Fetch updated counts
  $cnt = $db->prepare('
    SELECT
      COALESCE(SUM(vote =  1),0) AS likes,
      COALESCE(SUM(vote = -1),0) AS dislikes
    FROM thread_votes
    WHERE thread_id = :t
  ');
  $cnt->execute([':t' => $threadId]);
  $counts = $cnt->fetch(PDO::FETCH_ASSOC);

  echo json_encode([
    'thread_id' => $threadId,
    'likes'     => (int)$counts['likes'],
    'dislikes'  => (int)$counts['dislikes'],
  ]);
  exit;

} elseif ($postId) {

  $sql = <<<SQL
INSERT INTO post_votes (user_id, post_id, vote)
VALUES (:u, :p, :v)
ON CONFLICT(user_id, post_id) DO UPDATE SET
  vote = CASE
    WHEN post_votes.vote = excluded.vote THEN post_votes.vote
    ELSE excluded.vote
  END
SQL;
  $stmt = $db->prepare($sql);
  $stmt->execute([
    ':u' => $user,
    ':p' => $postId,
    ':v' => $vote
  ]);

  // fetch updated counts
  $cnt = $db->prepare('
    SELECT
      COALESCE(SUM(vote =  1),0) AS likes,
      COALESCE(SUM(vote = -1),0) AS dislikes
    FROM post_votes
    WHERE post_id = :p
  ');
  $cnt->execute([':p' => $postId]);
  $counts = $cnt->fetch(PDO::FETCH_ASSOC);

  echo json_encode([
    'post_id'  => $postId,
    'likes'    => (int)$counts['likes'],
    'dislikes' => (int)$counts['dislikes'],
  ]);
  exit;

} else {
  http_response_code(422);
  echo json_encode(['error' => 'No post_id or thread_id provided']);
  exit;
}
