<?php
require 'db.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$in = json_decode(file_get_contents('php://input'), true);

if ((empty($in['email']) && empty($in['nickname'])) || empty($in['password'])) {
  http_response_code(422);
  echo json_encode(['error'=>'Provide email or nickname, and password']);
  exit;
}

$field = !empty($in['email']) ? 'email' : 'nickname';
$idf   = trim($in[$field]);

$stmt = $db->prepare("
  SELECT id, fullname, nickname, email, password_hash, is_admin
  FROM users
  WHERE $field = :idf
");
$stmt->execute([':idf' => $idf]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($in['password'], $user['password_hash'])) {
  http_response_code(401);
  echo json_encode(['error'=>'Invalid credentials']);
  exit;
}

unset($user['password_hash']);
$_SESSION['user_id']  = $user['id'];
$_SESSION['nickname'] = $user['nickname'];

echo json_encode([
  'message' => 'Login successful',
  'user'    => $user
]);