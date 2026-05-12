fetch('http://localhost:3000/api/admin/users/1/profile').then(res => res.text()).then(console.log).catch(console.error);
