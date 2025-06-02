document.addEventListener('DOMContentLoaded', () => {
    // Handle registration
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }

    // Handle login 
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    setupRememberedUser();
    setupBirthdateValidation();
});

// Handle registration form submission
async function handleRegistration(e) {
    e.preventDefault();

    const form = e.target;
    
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    const fullname = document.getElementById('fullname').value.trim();
    const nickname = document.getElementById('nickname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const birthdate = document.getElementById('birthdate').value;

    console.log('Registration attempt with data:', {
        fullname,
        nickname,
        email,
        birthdate,
        passwordLength: password.length
    });


    const errors = {};
    let isValid = true;

    // Full Name validation
    if (!fullname) {
        errors.fullname = 'Full Name is required';
        isValid = false;
    } else if (fullname.length < 2) {
        errors.fullname = 'Full Name must be at least 2 characters';
        isValid = false;
    } else {
        const nameRegex = /^[A-Za-zÇçĞğİıÖöŞşÜü\s'\-]+$/;
        if (!nameRegex.test(fullname)) {
            errors.fullname = 'Only letters (including Turkish characters), spaces, hyphens, and apostrophes allowed';
            isValid = false;
        }
    }

    // Nickname validation
    if (!nickname) {
        errors.nickname = 'Nickname is required';
        isValid = false;
    } else if (nickname.length < 2) {
        errors.nickname = 'Nickname must be at least 2 characters';
        isValid = false;
    } else if (nickname.length > 20) {
        errors.nickname = 'Nickname must be 20 characters or less';
        isValid = false;
    } else {
        const nicknameRegex = /^[a-zA-Z0-9_\-]+$/;
        if (!nicknameRegex.test(nickname)) {
            errors.nickname = 'Nickname can only contain letters, numbers, underscores, and hyphens';
            isValid = false;
        }
    }

    // Email validation
    if (!email) {
        errors.email = 'Email is required';
        isValid = false;
    } else {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            errors.email = 'Invalid email address';
            isValid = false;
        }
    }

    // Password validation
    if (!password) {
        errors.password = 'Password is required';
        isValid = false;
    } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
        isValid = false;
    }

    // Confirm Password validation
    if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
        isValid = false;
    } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
        isValid = false;
    }

    // Birthdate validation
    if (!birthdate) {
        errors.birthdate = 'Birthdate is required';
        isValid = false;
    } else {
        // Check if user is at least 18
        const birthDate = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age < 18) {
            errors.birthdate = 'You must be at least 18 years old';
            isValid = false;
        }
    }

    if (!isValid) {
        Object.entries(errors).forEach(([field, message]) => {
            const inputEl = document.getElementById(field);
            if (inputEl) {
                const feedbackEl = inputEl.parentElement.querySelector('.invalid-feedback');
                inputEl.classList.add('is-invalid');
                if (feedbackEl) {
                    feedbackEl.textContent = message;
                }
            }
        });
        showAlert('Please correct the errors in the form', 'danger');
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Registering...';
    submitButton.disabled = true;

    try {
        console.log('Sending registration request...');
        
        const response = await fetch(`${API_BASE}/register.php`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                fullname, 
                nickname, 
                email, 
                password, 
                birthdate 
            })
        });

        console.log('Registration response status:', response.status);
        
        let result;
        try {
            result = await response.json();
            console.log('Registration response data:', result);
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            const textResponse = await response.text();
            console.error('Raw response:', textResponse);
            throw new Error('Server returned invalid response');
        }

        if (response.ok) {
            showAlert('Registration successful! Redirecting…', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            console.error('Registration failed:', result);
            
            // Show server-side error
            showAlert(result.error || 'Registration failed', 'danger');

            if (result.error && result.error.toLowerCase().includes('nickname')) {
                const nickEl = document.getElementById('nickname');
                const fb = nickEl.parentElement.querySelector('.invalid-feedback');
                nickEl.classList.add('is-invalid');
                if (fb) fb.textContent = result.error;
            } else if (result.error && result.error.toLowerCase().includes('email')) {
                const emailEl = document.getElementById('email');
                const fb = emailEl.parentElement.querySelector('.invalid-feedback');
                emailEl.classList.add('is-invalid');
                if (fb) fb.textContent = result.error;
            }
        }
    } catch (err) {
        console.error('Registration error:', err);
        showAlert('An error occurred during registration. Please try again.', 'danger');
    } finally {
        // Reset button state
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    if (!identifier || !password) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    // Determine if identifier is email or nickname
    const isEmail = identifier.includes('@');
    const loginData = {
        password: password
    };
    
    if (isEmail) {
        loginData.email = identifier;
    } else {
        loginData.nickname = identifier;
    }
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Logging in...';
    submitButton.disabled = true;
    
    try {
        console.log('Sending login request...');
        
        const response = await fetch(`${API_BASE}/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        console.log('Login response:', result);
        
        if (response.ok) {
            // Get full user data including admin status
            const userResponse = await fetch(`${API_BASE}/users.php?id=${result.user.id}`);
            const userData = await userResponse.json();
            
            console.log('Login - Full user data loaded:', userData);
            
            // Store user data in session
            sessionStorage.setItem('user', JSON.stringify(userData));
            
            // If remember me is checked, store in localStorage
            if (rememberMe) {
                localStorage.setItem('rememberUser', identifier);
            } else {
                localStorage.removeItem('rememberUser');
            }
            
            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect to home page after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showAlert(result.error || 'Invalid credentials', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login', 'danger');
    } finally {
        // Reset button state
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Toggle Password Visibility Function
function togglePassword(fieldId, button) {
    const passwordField = document.getElementById(fieldId);
    const icon = button.querySelector('i');

    if (!passwordField || !icon) {
        console.error('Password field or icon not found:', fieldId);
        return;
    }

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        button.setAttribute('title', 'Hide password');
    } else {
        passwordField.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        button.setAttribute('title', 'Show password');
    }
}

// Check for remembered user on login page
function setupRememberedUser() {
    if (document.getElementById('loginForm')) {
        const rememberedUser = localStorage.getItem('rememberUser');
        if (rememberedUser) {
            const identifierField = document.getElementById('loginIdentifier');
            const rememberCheckbox = document.getElementById('rememberMe');
            if (identifierField) identifierField.value = rememberedUser;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }
}

// Set up birthdate validation
function setupBirthdateValidation() {
    const birthdateInput = document.getElementById('birthdate');
    if (birthdateInput) {
        const today = new Date();
        const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        birthdateInput.max = maxDate.toISOString().split('T')[0];
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

window.togglePassword = togglePassword;