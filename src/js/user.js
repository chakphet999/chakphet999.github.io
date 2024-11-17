// Get the access token from LocalStorage
const accessToken = localStorage.getItem('accessToken');
let userId; 

if (accessToken) {
    // Fetch user profile including photo and user ID
    fetch('https://people.googleapis.com/v1/people/me?personFields=photos,metadata', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(profileData => {
            const profilePicUrl = profileData.photos && profileData.photos[0] ? profileData.photos[0].url : '/img/account.svg';
    
            // Set profile image
            document.getElementById("profileImage").src = profilePicUrl;
    
            // Assign userId to global variable
            userId = profileData.metadata && profileData.metadata.sources[0].id;
            console.log('User ID:', userId);
    
            // Fetch user expenses if userId exists
            if (userId) {
                fetchUserExpenses(userId, accessToken);
            } else {
                showLoginModal();
            }
        })
        .catch(error => {
            console.error('Error fetching profile:', error);
            document.getElementById("profileImage").src = '/img/account.svg';
            showLoginModal(); // Show login modal if there's an error or no profile data
        });    
} else {
    console.log('No access token found. Using guest account.');
    document.getElementById("profileImage").src = '/img/account.svg';
    showLoginModal(); // Show login modal if access token is missing
}

// Function to show the login modal
function showLoginModal() {
    const loginModal = document.createElement('div');
    loginModal.classList.add('modal');
    loginModal.style.display = 'flex';
    loginModal.innerHTML = `
        <div class="login-modal-content">
            <h2>ล็อกอินเพื่อเข้าถึง</h2>
            <p>กรุณาล็อกอินก่อนเริ่มใช้งาน</p>
            <center>
                <button class="login-button" onclick="redirectToLogin()">
                    <img src="/img/google.png" alt="Google Logo"> ล็อกอินด้วย Google
                </button>
            </center>
        </div>
    `;
    document.body.appendChild(loginModal);
}

// Function to redirect to the login page
function redirectToLogin() {
    const clientId = '1076051245330-qst17q9bccr4tvdkh43v45fivulr3q5e.apps.googleusercontent.com';
    const redirectUri = 'https://chakphet999.github.io/callback';
    const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = authUrl;
}


// Function to fetch expenses for the logged-in user
function fetchUserExpenses(userId, accessToken) {
    const spreadsheetId = '1l3PhkZika9epSSYIWW0dbKENY21n8eiL_6QpyXMD764';  // <-- ใส่ ID ของ Google Sheets
    const sheetName = userId;  // ใช้ userId เป็นชื่อแท็บ
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Fetched data from Google Sheets:', data); // Log the fetched data
        const rows = data.values;
        const userExpenses = rows || [];  // ถ้าไม่มีข้อมูลก็ใช้ array ว่าง
        console.log('User  expenses:', userExpenses); // Log user expenses

        // แสดงข้อมูล userExpenses ในหน้าเว็บ
        displayExpenses(userExpenses);
    })
    .catch(error => console.error('Error fetching user expenses:', error));
}

function displayExpenses(expenses) {
    const expenseList = document.getElementById("expenseList");
    expenseList.innerHTML = '';  // ล้างรายการก่อนแสดงใหม่

    expenses.forEach((expense, index) => {
        // แยกชื่อคนและสถานะจากคอลัมน์ F และ E
        const names = expense[4].split(', ');  // ชื่อคนที่คั่นด้วย ,
        const statuses = expense[5].split(', ');  // สถานะการชำระเงินที่คั่นด้วย ,

        const expenseItem = document.createElement("div");
        expenseItem.className = "expense-item";
        expenseItem.innerHTML = `
            <h3>${expense[2]}</h3>
            <p>จำนวนเงิน: ${expense[3]} บาท</p>
            <h4>สถานะการจ่ายเงิน:</h4>
            <ul>
                ${names.map((name, idx) => `
                    <li>
                        <span>${name}</span>  <!-- แสดงชื่อคน -->
                        <select class="payment-status" data-row="${index}">
                            <option value="not_paid" ${statuses[idx] === 'not_paid' ? 'selected' : ''}>ยังไม่จ่าย</option>
                            <option value="paid" ${statuses[idx] === 'paid' ? 'selected' : ''}>จ่ายแล้ว</option>
                        </select>
                    </li>
                `).join('')}
            </ul>
        `;
        expenseList.insertBefore(expenseItem, expenseList.firstChild);
        console.log("Added : ", expense[2])
    });
    
}

// ฟังก์ชันสำหรับอัปเดตสถานะการจ่ายเงิน
document.getElementById('expenseList').addEventListener('change', function(event) {
    if (event.target.classList.contains('payment-status')) {
        if (!userId) {
            console.error('User ID is not defined.');
            return;
        }

        const status = event.target.value;  // ค่าใหม่ที่เลือก
        const rowIndex = event.target.getAttribute('data-row');  // ดัชนีของแถวที่ถูกเลือก

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('Access token not found.');
            return;
        }

        // ดึงสถานะเพื่อนจากที่เก็บใน UI
        const expenseItems = document.querySelectorAll('.expense-item');
        const expenseItem = expenseItems[rowIndex];  // เลือกการ์ดที่ถูกแก้ไข
        const friends = expenseItem.querySelectorAll('ul li span');
        const friendsStatuses = Array.from(friends).map(friend => friend.nextElementSibling.value);  // ดึงสถานะปัจจุบัน

        // อัปเดตสถานะของเพื่อนคนที่เลือก
        const friendIndex = Array.from(friends).findIndex(friend => friend.textContent === event.target.previousElementSibling.textContent);
        friendsStatuses[friendIndex] = status;  // เปลี่ยนสถานะของเพื่อนคนนี้

        const updatedStatuses = friendsStatuses.join(', ');  // รวมสถานะใหม่ทั้งหมด

        const requestBody = {
            range: `${userId}!F${parseInt(rowIndex) + 1}`,
            values: [[updatedStatuses]] // ต้องเป็น array ซ้อน
        };
        
        const requestUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${userId}!F${parseInt(rowIndex) + 1}?valueInputOption=RAW`;
        
        // console.log('Request Body:', requestBody);
        console.log('Request URL:', requestUrl);
        
        fetch(requestUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Payment status updated:', data);
        })
        .catch(error => {
            console.error('Error updating payment status:', error);
        });
        
    }
});