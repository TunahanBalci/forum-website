async function loadProfile() {
  try {
    const resp     = await fetch(`${API_BASE}/users.php?id=${currentUser.id}`);
    const userData = await resp.json();

    document.getElementById('profileAvatar').src        = userData.image_path || 'images/default-avatar.png';
    document.getElementById('profileNickname').textContent  = userData.nickname;
    document.getElementById('profileFullname').textContent  = userData.fullname;
    document.getElementById('profileEmail').textContent     = userData.email;
    document.getElementById('profileBirthdate').textContent = new Date(userData.birthdate).toLocaleDateString();
    document.getElementById('profileJoined').textContent    = new Date(userData.created_at).toLocaleDateString();
    document.getElementById('profilePostCount').textContent = userData.post_count || 0;

    document.getElementById('newNickname').value = userData.nickname;
    document.getElementById('bio').value         = userData.bio || '';
  } catch (e) {
    console.error('Error loading profile', e);
    showAlert('Could not load profile data', 'danger');
  }
}

async function handleAvatarUpdate(e) {
  e.preventDefault();
  const input = document.getElementById('avatarInput');
  if (!input.files.length) {
    showAlert('Please choose an image first', 'warning');
    return;
  }
  const file = input.files[0];
  if (file.size > 2 * 1024 * 1024) {
    showAlert('Image must be under 2 MB', 'warning');
    return;
  }
  if (!file.type.startsWith('image/')) {
    showAlert('Please select a valid image', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await fetch(`${API_BASE}/users.php?id=${currentUser.id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ image_path: reader.result })
      });
      // Update session + navbar + header image
      currentUser.image_path = reader.result;
      sessionStorage.setItem('user', JSON.stringify(currentUser));
      updateUIForAuth();
      document.getElementById('profileAvatar').src = reader.result;
      showAlert('Avatar updated!', 'success');
    } catch (err) {
      console.error('Avatar upload failed', err);
      showAlert('Error uploading avatar', 'danger');
    }
  };
  reader.readAsDataURL(file);
}

async function handleNicknameUpdate(e) {
  e.preventDefault();
  const nn = document.getElementById('newNickname').value.trim();
  if (nn.length < 3) {
    showAlert('Nickname must be at least 3 characters', 'warning');
    return;
  }
  if (nn === currentUser.nickname) {
    showAlert('That is already your nickname', 'info');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/users.php?id=${currentUser.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nickname: nn })
    });
    if (!res.ok) throw await res.json();
    currentUser.nickname = nn;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    updateUIForAuth();
    document.getElementById('profileNickname').textContent = nn;
    showAlert('Nickname updated!', 'success');
  } catch (err) {
    console.error('Nickname update failed', err);
    showAlert(err.error || 'Error updating nickname', 'danger');
  }
}

async function handlePasswordUpdate(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  // Client-side validation
  if (newPassword.length < 6) {
    showAlert('New password must be at least 6 characters', 'warning');
    return;
  }
  if (newPassword !== confirmNewPassword) {
    showAlert('Passwords do not match', 'warning');
    return;
  }

  try {
    console.log('Sending password change request to users.php...');
    
    const response = await fetch(`${API_BASE}/users.php?id=${currentUser.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        password_change: true,  // Special flag to indicate password change
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Response data:', result);

    if (response.ok) {
      showAlert('Password updated successfully!', 'success');
      document.getElementById('passwordForm').reset();
    } else {
      showAlert(result.error || 'Error updating password', 'danger');
    }
  } catch (err) {
    console.error('Password update failed', err);
    showAlert('Error updating password', 'danger');
  }
}

async function handleBioUpdate(e) {
  e.preventDefault();
  const bio = document.getElementById('bio').value.trim();
  try {
    await fetch(`${API_BASE}/users.php?id=${currentUser.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ bio })
    });
    currentUser.bio = bio;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    showAlert('Bio updated!', 'success');
  } catch (err) {
    console.error('Bio update failed', err);
    showAlert('Error updating bio', 'danger');
  }
}

document.addEventListener('DOMContentLoaded', async () => {

  await checkAuth();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  console.log('Current user:', currentUser);

  await loadProfile();

  document.getElementById('avatarForm')   .addEventListener('submit', handleAvatarUpdate);
  document.getElementById('nicknameForm') .addEventListener('submit', handleNicknameUpdate);
  document.getElementById('passwordForm') .addEventListener('submit', handlePasswordUpdate);
  document.getElementById('bioForm')      .addEventListener('submit', handleBioUpdate);
});