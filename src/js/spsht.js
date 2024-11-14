fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
})
.then(response => response.json())
.then(data => {
    const userId = data.sub;  // userId จากข้อมูลโปรไฟล์
    console.log('User ID:', userId);

    // เรียกใช้ฟังก์ชันตรวจสอบและบันทึก userId
    checkAndStoreUser(userId);
})
.catch(error => console.error('Error fetching user info:', error));


function checkAndStoreUser(userId) {
    const spreadsheetId = '1S8gjufLAVjbaKmQTaG4PHow9FyL6uLWfgkVyFY6WXCY';
    const range = 'Sheet1!A:A';  // ตรวจสอบในคอลัมน์ A

    // ตรวจสอบว่า userId นี้มีอยู่ใน Sheet หรือไม่
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?majorDimension=COLUMNS`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const existingUserIds = data.values ? data.values[0] : [];
        if (existingUserIds.includes(userId)) {
            console.log('User already exists.');
        } else {
            // ถ้าไม่มี userId นี้ใน sheet ให้เพิ่มลงไป
            const body = {
                values: [[userId]]
            };
            fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:append`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })
            .then(response => response.json())
            .then(data => console.log('New user added:', data))
            .catch(error => console.error('Error adding user:', error));
        }
    })
    .catch(error => console.error('Error checking user ID:', error));
}
