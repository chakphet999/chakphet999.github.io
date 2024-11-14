// เปิด modal
const modal = document.getElementById("addExpenseModal");
const openModalButton = document.querySelector(".bottom-wide-button");
const closeModalButton = document.getElementById("closeModal");
const saveExpenseButton = document.getElementById("saveExpense");

// Spreadsheet ID ของคุณ
const spreadsheetId = '1S8gjufLAVjbaKmQTaG4PHow9FyL6uLWfgkVyFY6WXCY';  // <-- ใส่ ID ของ Google Sheets ที่คุณสร้างไว้

// Function สำหรับดึง user_id
function getUserId(accessToken) {
    return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(response => response.json())
    .then(data => data.sub)  // `sub` คือ user_id ของ Google
    .catch(error => {
        console.error('Error fetching user ID:', error);
        return null;
    });
}

openModalButton.addEventListener("click", () => {
    modal.style.display = "block";
});

closeModalButton.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// บันทึกข้อมูลค่าใช้จ่ายไปยัง Google Sheets พร้อมกับ user_id
saveExpenseButton.addEventListener("click", async () => {
    const expenseName = document.getElementById("expenseName").value;
    const amount = document.getElementById("amount").value;
    const friends = document.getElementById("friends").value.split(",").map(friend => friend.trim());

    // ตรวจสอบ accessToken ใน LocalStorage
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('Access token not found.');
        return;
    }

    // ดึง user_id ของผู้ใช้
    const userId = await getUserId(accessToken);
    if (!userId) {
        console.error('Unable to fetch user ID');
        return;
    }

    // สร้างสถานะการจ่ายเงินเริ่มต้น (not_paid) สำหรับทุกเพื่อน
    const paymentStatus = new Array(friends.length).fill("not_paid").join(", ");

    // ส่งข้อมูลไปยัง Google Sheets API
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            values: [
                [userId, new Date().toLocaleString(), expenseName, amount, friends.join(', '), paymentStatus] // เพิ่มสถานะการจ่ายเงินเริ่มต้น
            ]
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Expense added to Google Sheets:', data);

        // เรียกฟังก์ชันใน user.js เพื่อนำข้อมูลค่าใช้จ่ายที่อัปเดตมาแสดงใน UI
        fetchUserExpenses(userId, accessToken);

        // ล้างค่าในฟอร์มหลังบันทึก
        document.getElementById("expenseName").value = '';
        document.getElementById("amount").value = '';
        document.getElementById("friends").value = '';
    })
    .catch(error => console.error('Error adding expense to Google Sheets:', error));
});
