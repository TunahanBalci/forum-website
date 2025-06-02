<?php
require 'db.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$in = json_decode(file_get_contents('php://input'), true);
// require: fullname, nickname, email, password, birthdate
foreach (['fullname','nickname','email','password','birthdate'] as $f) {
  if (empty($in[$f])) {
    http_response_code(422);
    echo json_encode(['error'=>"Missing field: $f"]);
    exit;
  }
}

if (!filter_var($in['email'], FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(['error'=>'Invalid email']);
  exit;
}

$hash = password_hash($in['password'], PASSWORD_DEFAULT);

try {
  $stmt = $db->prepare('
    INSERT INTO users (fullname, nickname, email, password_hash, birthdate)
    VALUES (:fn, :nick, :email, :pw, :bd)
  ');
  $stmt->execute([
    ':fn'   => $in['fullname'],
    ':nick' => $in['nickname'],
    ':email'=> $in['email'],
    ':pw'   => $hash,
    ':bd'   => $in['birthdate']
  ]);

  $uid = $db->lastInsertId();
  $_SESSION['user_id']  = $uid;
  $_SESSION['nickname'] = $in['nickname'];

  http_response_code(201);
  echo json_encode([
    'id'       => $uid,
    'nickname' => $in['nickname'],
    'message'  => 'Registration successful'
  ]);

} catch (PDOException $e) {

    if ($e->getCode() === '23000') {
        $driverMsg = $e->getMessage();

        if (stripos($driverMsg, 'users.nickname') !== false) {
            http_response_code(409);
            echo json_encode(['error' => 'Nickname already in use']);
        } elseif (stripos($driverMsg, 'users.email') !== false) {
            http_response_code(409);
            echo json_encode(['error' => 'Email already in use']);
        } else {

            http_response_code(409);
            echo json_encode(['error' => 'Nickname or email already in use']);
        }
    } else {
        http_response_code(500);
        echo json_encode([
            'error'   => 'Server error',
            'details' => $e->getMessage()
        ]);
    }
}
