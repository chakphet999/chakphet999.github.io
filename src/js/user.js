// Get the access token from LocalStorage
const accessToken = localStorage.getItem('accessToken');

if (accessToken) {
    // Fetch user profile including photo and user ID
    fetch('https://people.googleapis.com/v1/people/me?personFields=photos,metadata', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(profileData => {
            // ดึง URL ของรูปภาพโปรไฟล์
            const profilePicUrl = profileData.photos && profileData.photos[0] ? profileData.photos[0].url : '/img/account.svg';

            // แสดงรูปโปรไฟล์หรือรูปเริ่มต้น
            document.getElementById("profileImage").src = profilePicUrl;

            // ดึง user_id และแสดงใน console log
            const userId = profileData.metadata && profileData.metadata.sources[0].id;
            console.log('User ID:', userId);

            // เรียกใช้ฟังก์ชันเพื่อดึงรายการค่าใช้จ่ายของผู้ใช้
            fetchUserExpenses(userId, accessToken);
        })
        .catch(error => {
            console.error('Error fetching profile:', error);
            // Use default image if error occurs
            document.getElementById("profileImage").src = '/img/account.svg';
        });
} else {
    console.log('No access token found. Using guest account.');

    // Set profile image to default
    document.getElementById("profileImage").src = '/img/account.svg';

    // Create and display the login modal
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

    // Function to redirect to the login page
    function redirectToLogin() {
        const clientId = '1076051245330-qst17q9bccr4tvdkh43v45fivulr3q5e.apps.googleusercontent.com';
        const redirectUri = 'https://chakphet999.github.io/callback';
        const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
        window.location.href = authUrl;
    }
}

// Function to fetch expenses for the logged-in user
function fetchUserExpenses(userId, accessToken) {
    const spreadsheetId = '1l3PhkZika9epSSYIWW0dbKENY21n8eiL_6QpyXMD764';  // <-- ใส่ ID ของ Google Sheets
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(response => response.json())
    .then(data => {
        const rows = data.values;
        const userExpenses = rows.filter(row => row[0] === userId);
        console.log('User expenses:', userExpenses);

        // แสดงข้อมูล userExpenses ในหน้าเว็บ
        displayExpenses(userExpenses);
    })
    .catch(error => console.error('Error fetching user expenses:', error));
}

// Function to display expenses on the web page
function displayExpenses(expenses) {
    const expenseList = document.getElementById("expenseList");
    expenseList.innerHTML = '';  // ล้างรายการก่อนแสดงใหม่

    expenses.forEach((expense, index) => {
        const expenseItem = document.createElement("div");
        expenseItem.className = "expense-item";
        expenseItem.innerHTML = `
            <h3>${expense[2]}</h3>
            <p>จำนวนเงิน: ${expense[3]} บาท</p>
            <h4>สถานะการจ่ายเงิน:</h4>
            <ul>
                ${expense[4].split(', ').map((status, idx) => `
                    <li>
                        <span>${status}</span>
                        <select class="payment-status" data-row="${index}">
                            <option value="not_paid" ${status === 'not_paid' ? 'selected' : ''}>ยังไม่จ่าย</option>
                            <option value="paid" ${status === 'paid' ? 'selected' : ''}>จ่ายแล้ว</option>
                        </select>
                    </li>
                `).join('')}
            </ul>
        `;
        expenseList.appendChild(expenseItem);
    });
}

// ฟังก์ชันสำหรับอัปเดตสถานะการจ่ายเงิน
document.getElementById('expenseList').addEventListener('change', function(event) {
    if (event.target.classList.contains('payment-status')) {
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

        // log สถานะก่อนอัปเดต
        console.log('Current statuses before update:', friendsStatuses);

        // อัปเดตสถานะของเพื่อนคนที่เลือก
        const friendIndex = Array.from(friends).findIndex(friend => friend.textContent === event.target.previousElementSibling.textContent);
        friendsStatuses[friendIndex] = status;  // เปลี่ยนสถานะของเพื่อนคนนี้

        // log สถานะหลังการอัปเดต
        console.log('Updated statuses:', friendsStatuses);

        // สร้าง string ใหม่สำหรับสถานะ
        const updatedStatuses = friendsStatuses.join(', ');  // รวมสถานะใหม่ทั้งหมด
        console.log('Updated statuses to send:', updatedStatuses);

        // สร้างข้อมูลใหม่ที่จะอัปเดตใน Google Sheets
        const requestBody = {
            range: `Sheet1!F${parseInt(rowIndex) + 1}`,  // แถวและคอลัมน์ที่ต้องการอัปเดต
            values: [[updatedStatuses]]  // ส่งสถานะในรูปแบบข้อความเดียว
        };

        console.log('Request body:', JSON.stringify(requestBody));

        // ส่งข้อมูลไปยัง Google Sheets API
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!F${parseInt(rowIndex) + 1}:update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)  // ส่งข้อมูลตามที่เตรียมไว้
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
