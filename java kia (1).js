        // --- AUTHENTICATION / LOGIN ---
        const USER_CREDENTIALS = {
            username: "kader",
            password: "123"
        };

        function checkLogin() {
            const isLoggedIn = localStorage.getItem('posyandu_isLogged');
            if (isLoggedIn === 'true') {
                document.getElementById('login-overlay').style.display = 'none';
                document.getElementById('app-container').style.display = 'flex';
                document.getElementById('app-container').classList.remove('hidden');
                updateDashboard();
            } else {
                document.getElementById('login-overlay').style.display = 'flex';
                document.getElementById('app-container').style.display = 'none';
            }
        }

        function doLogin() {
            const u = document.getElementById('login-username').value;
            const p = document.getElementById('login-password').value;

            if (u === USER_CREDENTIALS.username && p === USER_CREDENTIALS.password) {
                localStorage.setItem('posyandu_isLogged', 'true');
                showToast('Login Berhasil!', 'success');
                setTimeout(() => {
                    checkLogin();
                }, 500);
            } else {
                showToast('Username atau Password salah!', 'error');
            }
        }

        function doLogout() {
            if(confirm("Apakah Anda yakin ingin keluar?")) {
                localStorage.removeItem('posyandu_isLogged');
                location.reload();
            }
        }

        // --- DATA STORE ---
        const DB = {
            mothers: JSON.parse(localStorage.getItem('kia_mothers')) || [],
            children: JSON.parse(localStorage.getItem('kia_children')) || [],
            save: function() {
                localStorage.setItem('kia_mothers', JSON.stringify(this.mothers));
                localStorage.setItem('kia_children', JSON.stringify(this.children));
                updateDashboard();
            }
        };

        // --- NAVIGATION ---
        function nav(id) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            
            document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
            document.getElementById('link-'+id).classList.add('active');

            const titles = {
                'dashboard': 'Dashboard',
                'ibu-data': 'Data Ibu Hamil & Identitas',
                'ibu-panduan': 'Panduan Ibu Hamil',
                'persalinan-panduan': 'Panduan Persalinan',
                'nifas-panduan': 'Panduan Nifas & Bayi Baru',
                'anak-data': 'Data Anak & Grafik BB',
                'anak-panduan': 'Panduan Balita & ASI',
                'rekap': 'Rekap Data & Export Excel'
            };
            document.getElementById('page-title').innerText = titles[id];
            
            // Tutup sidebar & overlay setelah klik menu (untuk HP)
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebar-overlay').classList.remove('active');

            if(id === 'ibu-data') renderIbuList();
            if(id === 'anak-data') renderAnakList();
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('sidebar-overlay').classList.toggle('active');
        }

        function openModal(id) {
            document.getElementById(id).classList.add('active');
            if(id === 'modal-ibu') {
                document.getElementById('form-ibu').reset();
                document.getElementById('ibu-usia-hasil').innerText = "";
                document.getElementById('ibu-usia-kehamilan-hasil').innerText = "";
                document.getElementById('ibu-usia-kehamilan-hasil').style.backgroundColor = '#ECFDF5';
                document.getElementById('ibu-usia-kehamilan-hasil').style.color = 'var(--primary-dark)';
            }
            if(id === 'modal-anak') {
                document.getElementById('form-anak').reset();
                document.getElementById('anak-usia-hasil').innerText = "";
            }
            // Set default dates
            const now = new Date().toISOString().split('T')[0];
            document.querySelectorAll('input[type="date"]').forEach(i => {
                if(i.value === '' && i.id !== 'ibu-hpht' && i.id !== 'ibu-dob' && i.id !== 'anak-dob') i.value = now;
            });
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        function showToast(msg, type = 'success') {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.className = `toast show ${type}`;
            setTimeout(() => t.classList.remove('show'), 3000);
        }

        // --- HELPER: Hitung Usia Kehamilan dengan Batas Maksimal 42 Minggu ---
        function getPregnancyInfo(hphtStr) {
            if (!hphtStr) return { weeks: 0, days: 0, text: '', status: '', isOver: false };

            const hpht = new Date(hphtStr);
            const today = new Date();
            const diffTime = today - hpht;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const totalWeeks = Math.floor(diffDays / 7);
            const remainDays = diffDays % 7;

            const MAX_WEEKS = 42; // Batas maksimal kehamilan (~10 bulan)

            if (totalWeeks > MAX_WEEKS) {
                const hplDate = new Date(hpht);
                hplDate.setDate(hplDate.getDate() + 280);
                const daysPastHPL = Math.floor((today - hplDate) / (1000 * 60 * 60 * 24));

                return {
                    weeks: MAX_WEEKS,
                    days: 0,
                    text: 'Sudah Melahirkan / Lewat Waktu',
                    status: 'Sudah Melahirkan',
                    isOver: true,
                    daysPastHPL: daysPastHPL
                };
            }

            let status = 'Normal';
            if (totalWeeks < 12) status = 'Trimester 1';
            else if (totalWeeks < 28) status = 'Trimester 2';
            else if (totalWeeks < 37) status = 'Trimester 3';
            else status = 'Cukup Bulan (Siap Lahir)';

            return {
                weeks: totalWeeks,
                days: remainDays,
                text: `${totalWeeks} Minggu ${remainDays} Hari`,
                status: status,
                isOver: false
            };
        }

        function calcHPL() {
            const hpht = document.getElementById('ibu-hpht').value;
            if(!hpht) return;
            const d = new Date(hpht);
            d.setDate(d.getDate() + 280);
            document.getElementById('ibu-hpl').value = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
            updatePregnancyAge(hpht);
        }

        function updatePregnancyAge(hphtStr) {
            const resultEl = document.getElementById('ibu-usia-kehamilan-hasil');

            if (!hphtStr) {
                resultEl.innerText = "";
                return;
            }

            const info = getPregnancyInfo(hphtStr);

            if (info.isOver) {
                resultEl.innerText = `⚠️ ${info.text} (HPL sudah lewat ${info.daysPastHPL} hari)`;
                resultEl.style.backgroundColor = '#FEF2F2';
                resultEl.style.borderColor = '#FCA5A5';
                resultEl.style.color = '#DC2626';
            } else {
                resultEl.innerText = `Usia Kehamilan: ${info.text} — ${info.status}`;
                resultEl.style.backgroundColor = '#ECFDF5';
                resultEl.style.borderColor = '#D1FAE5';
                resultEl.style.color = '#047857';
            }
        }

        function getDetailedAge(dateString) {
            if(!dateString) return "";
            const birthDate = new Date(dateString);
            const today = new Date();
            
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            let days = today.getDate() - birthDate.getDate();

            if (days < 0) {
                months--;
                const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), 0);
                days += prevMonthDate.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            return `${years} Tahun ${months} Bulan ${days} Hari`;
        }

        function calculateMotherAge() {
            const dob = document.getElementById('ibu-dob').value;
            const resultBox = document.getElementById('ibu-usia-hasil');
            const hiddenUsia = document.getElementById('ibu-usia-hidden');

            if(!dob) {
                resultBox.innerText = "";
                hiddenUsia.value = "";
                return;
            }

            const resultString = getDetailedAge(dob);
            resultBox.innerText = `Usia Ibu: ${resultString}`;
            
            const birthDate = new Date(dob);
            const today = new Date();
            const diffTime = Math.abs(today - birthDate);
            const ageDate = new Date(diffTime); 
            const years = Math.abs(ageDate.getUTCFullYear() - 1970);
            hiddenUsia.value = years;
        }

        function calculateChildAge() {
            const dob = document.getElementById('anak-dob').value;
            const display = document.getElementById('anak-usia-hasil');
            
            if(!dob) {
                display.innerText = "";
                return;
            }

            const resultString = getDetailedAge(dob);
            display.innerText = `Usia: ${resultString}`;
        }

        // --- IBU LOGIC ---
        function saveIbu() {
            const data = {
                id: Date.now(),
                nama: document.getElementById('ibu-nama').value,
                nik: document.getElementById('ibu-nik').value,
                usia: document.getElementById('ibu-usia-hidden').value,
                alamat: document.getElementById('ibu-alamat').value,
                suami: document.getElementById('ibu-suami').value,
                hp: document.getElementById('ibu-hp').value,
                hpht: document.getElementById('ibu-hpht').value,
                hpl: document.getElementById('ibu-hpl').value,
                dob: document.getElementById('ibu-dob').value,
                g: document.getElementById('ibu-g').value,
                p: document.getElementById('ibu-p').value,
                a: document.getElementById('ibu-a').value,
                anc: []
            };
            DB.mothers.push(data);
            DB.save();
            closeModal('modal-ibu');
            renderIbuList();
            showToast('Data Ibu berhasil disimpan');
        }

        function renderIbuList() {
            const tbody = document.getElementById('tbody-ibu');
            const search = document.getElementById('search-ibu').value.toLowerCase();
            tbody.innerHTML = '';
            
            const filtered = DB.mothers.filter(m => m.nama.toLowerCase().includes(search) || m.nik.includes(search));
            
            filtered.forEach((m, idx) => {
                const info = getPregnancyInfo(m.hpht);

                // Tentukan warna badge berdasarkan status
                let badgeClass = 'badge-pink';   // default
                let badgeText = info.text || '0 Minggu';

                if (info.isOver) {
                    badgeClass = ''; // tanpa class default, pakai inline style
                    badgeText = 'Sudah Melahirkan';
                } else if (info.weeks >= 37) {
                    badgeClass = 'badge-blue';
                }

                const usiaBadge = info.isOver
                    ? `<span style="background:#FEF2F2; color:#DC2626; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">${badgeText}</span>`
                    : `<span class="badge ${badgeClass}">${badgeText}</span>`;

                // Tambahan info status trimester
                const statusText = info.isOver ? '' : `<br><small style="color:#6B7280;">${info.status}</small>`;

                const row = `
                    <tr>
                        <td>
                            <strong>${m.nama}</strong><br>
                            <small style="color:#666">Usia: ${m.usia} thn</small>
                        </td>
                        <td>${m.nik}</td>
                        <td>${m.suami || '-'}</td>
                        <td>${usiaBadge}${statusText}</td>
                        <td>${m.hpht}<br><small>${m.hpl}</small></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="openANC(${m.id})">Periksa (ANC)</button>
                                <button class="btn btn-sm btn-secondary" onclick="detailIbu(${m.id})">Detail</button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }

        function openANC(id) {
            const m = DB.mothers.find(x => x.id === id);
            if(!m) return;
            document.getElementById('anc-id').value = id;
            document.getElementById('anc-nama-ibu').innerText = m.nama;
            openModal('modal-anc');
        }

        function saveANC() {
            const id = parseInt(document.getElementById('anc-id').value);
            const idx = DB.mothers.findIndex(x => x.id === id);
            if(idx === -1) return;

            const visit = {
                tgl: document.getElementById('anc-tgl').value,
                um: document.getElementById('anc-um').value,
                td: document.getElementById('anc-td').value,
                bb: document.getElementById('anc-bb').value,
                tfu: document.getElementById('anc-tfu').value,
                lila: document.getElementById('anc-lila').value,
                fe: document.getElementById('anc-fe').value,
                tt: document.getElementById('anc-tt').value,
                usg: document.getElementById('anc-usg').value
            };

            DB.mothers[idx].anc.push(visit);
            DB.save();
            closeModal('modal-anc');
            showToast('Kunjungan ANC berhasil dicatat');
        }

        function detailIbu(id) {
            const m = DB.mothers.find(x => x.id === id);
            if(!m) return;
            
            let ageText = m.usia + " Tahun";
            if(m.dob) {
                ageText = getDetailedAge(m.dob);
            }

            // Ambil info kehamilan terkini
            const info = getPregnancyInfo(m.hpht);
            let kehamilanText = info.text;
            if(info.isOver) kehamilanText = `<span style="color:red">${info.status}</span>`;

            const html = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div><strong>NIK:</strong> ${m.nik}</div>
                    <div><strong>Usia:</strong> ${ageText}</div>
                    <div><strong>Suami:</strong> ${m.suami}</div>
                    <div><strong>No HP:</strong> ${m.hp}</div>
                    <div style="grid-column: span 2;"><strong>Alamat:</strong> ${m.alamat}</div>
                    <div><strong>GPA:</strong> G${m.g}-P${m.p}-A${m.a}</div>
                    <div><strong>Status Kehamilan:</strong> ${kehamilanText}</div>
                    <div><strong>HPHT:</strong> ${m.hpht}</div>
                    <div><strong>HPL:</strong> ${m.hpl}</div>
                </div>
            `;
            document.getElementById('detail-content').innerHTML = html;
            
            const tbody = document.getElementById('history-anc');
            tbody.innerHTML = '';
            m.anc.forEach(a => {
                tbody.innerHTML += `
                    <tr>
                        <td>${a.tgl}</td>
                        <td>${a.um}m</td>
                        <td>${a.bb}</td>
                        <td>${a.td}</td>
                        <td>${a.fe}/${a.tt}</td>
                    </tr>
                `;
            });
            
            openModal('modal-detail-ibu');
        }

        // --- ANAK LOGIC ---
        function saveAnak() {
            const data = {
                id: Date.now(),
                nama: document.getElementById('anak-nama').value,
                nik: document.getElementById('anak-nik').value,
                dob: document.getElementById('anak-dob').value,
                jk: document.getElementById('anak-jk').value,
                ibu: document.getElementById('anak-ibu').value,
                visits: []
            };
            DB.children.push(data);
            DB.save();
            closeModal('modal-anak');
            renderAnakList();
            showToast('Data Anak berhasil disimpan');
        }

        function renderAnakList() {
            const tbody = document.getElementById('tbody-anak');
            const search = document.getElementById('search-anak').value.toLowerCase();
            tbody.innerHTML = '';
            
            const filtered = DB.children.filter(c => c.nama.toLowerCase().includes(search));
            
            filtered.forEach((c, idx) => {
                const lastVisit = c.visits.length ? c.visits[c.visits.length-1] : null;
                const bb = lastVisit ? lastVisit.bb : '-';
                let status = '-';
                if(bb !== '-') status = 'Normal'; 

                // Tambahan: Cek apakah ada data grafik
                const hasChart = c.visits.length > 0;

                const row = `
                    <tr>
                        <td><strong>${c.nama}</strong> <span class="badge badge-blue">${c.jk}</span></td>
                        <td>${c.dob}</td>
                        <td>${c.ibu}</td>
                        <td><strong>${bb}</strong> kg</td>
                        <td><span class="badge badge-pink">${status}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="openVisitAnak(${c.id})">Timbang</button>
                                ${hasChart ? `<button class="btn btn-sm btn-info" onclick="openChart(${c.id})">📈 Grafik</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }

        function openVisitAnak(id) {
            const c = DB.children.find(x => x.id === id);
            if(!c) return;
            document.getElementById('visit-id').value = id;
            document.getElementById('visit-nama-anak').innerText = c.nama;
            openModal('modal-visit-anak');
        }

        function saveVisitAnak() {
            const id = parseInt(document.getElementById('visit-id').value);
            const idx = DB.children.findIndex(x => x.id === id);
            if(idx === -1) return;

            const visit = {
                tgl: document.getElementById('visit-tgl').value,
                umur: document.getElementById('visit-umur').value,
                bb: document.getElementById('visit-bb').value,
                tb: document.getElementById('visit-tb').value,
                lk: document.getElementById('visit-lk').value,
                vit: document.getElementById('visit-vit').value,
                imun: document.getElementById('visit-imun').value
            };

            DB.children[idx].visits.push(visit);
            DB.save();
            closeModal('modal-visit-anak');
            showToast('Hasil timbangan berhasil disimpan');
        }

        // --- CHART LOGIC ---
        let weightChartInstance = null;

        function openChart(childId) {
            const child = DB.children.find(x => x.id === childId);
            if(!child) return;

            // Update Modal Title
            document.getElementById('grafik-subtitle').innerText = `Grafik Berat Badan: ${child.nama} (${child.jk})`;

            // Prepare Data: Sort visits by date
            const sortedVisits = [...child.visits].sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
            
            // Extract labels (Tanggal) and data (Berat Badan)
            const labels = sortedVisits.map(v => {
                const date = new Date(v.tgl);
                return `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
            });
            const dataPoints = sortedVisits.map(v => v.bb);

            const ctx = document.getElementById('weightChart').getContext('2d');

            // Destroy previous chart instance to prevent overlay
            if (weightChartInstance) {
                weightChartInstance.destroy();
            }

            // Create Gradient
            let gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(5, 150, 105, 0.5)');
            gradient.addColorStop(1, 'rgba(5, 150, 105, 0.0)');

            // Render New Chart
            weightChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Berat Badan (kg)',
                        data: dataPoints,
                        borderColor: '#059669', // Emerald Green
                        backgroundColor: gradient,
                        borderWidth: 3,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#047857',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        fill: true,
                        tension: 0.3 // Smooth curve
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.dataset.label}: ${context.parsed.y} kg`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Berat (kg)'
                            },
                            grid: {
                                color: '#f3f4f6'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Tanggal Kunjungan'
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });

            openModal('modal-grafik');
        }

        function updateDashboard() {
            document.getElementById('count-ibu').innerText = DB.mothers.length;
            document.getElementById('count-anak').innerText = DB.children.length;
            
            let totalAnc = 0;
            DB.mothers.forEach(m => totalAnc += m.anc.length);
            document.getElementById('count-anc').innerText = totalAnc;

            document.getElementById('recap-ibu').innerText = DB.mothers.length;
            document.getElementById('recap-anak').innerText = DB.children.length;
        }

        // --- EXPORT EXCEL LOGIC ---
        function exportToExcel() {
            const dataIbu = DB.mothers.map(m => {
                const lastAnc = m.anc.length > 0 ? m.anc[m.anc.length - 1] : {};
                let ageExport = m.usia + " Tahun";
                if(m.dob) ageExport = getDetailedAge(m.dob);

                const info = getPregnancyInfo(m.hpht);

                return {
                    "Nama Ibu": m.nama,
                    "NIK": m.nik,
                    "Usia Lengkap": ageExport,
                    "Nama Suami": m.suami,
                    "No HP": m.hp,
                    "Alamat": m.alamat,
                    "HPHT": m.hpht,
                    "HPL": m.hpl,
                    "Status Kehamilan": info.isOver ? "Sudah Melahirkan/Lewat" : info.status,
                    "Usia Kehamilan": info.text,
                    "GPA": `G${m.g}-P${m.p}-A${m.a}`,
                    "Jumlah Kunjungan ANC": m.anc.length,
                    "Tgl Periksa Terakhir": lastAnc.tgl || "-",
                    "BB Terakhir (kg)": lastAnc.bb || "-",
                    "TD Terakhir": lastAnc.td || "-",
                    "USG Terakhir": lastAnc.usg || "-"
                };
            });

            const dataAnak = DB.children.map(c => {
                const lastVisit = c.visits.length > 0 ? c.visits[c.visits.length - 1] : {};
                return {
                    "Nama Anak": c.nama,
                    "NIK": c.nik,
                    "Tanggal Lahir": c.dob,
                    "Jenis Kelamin": c.jk,
                    "Nama Ibu": c.ibu,
                    "Jumlah Timbangan": c.visits.length,
                    "BB Terakhir (kg)": lastVisit.bb || "-",
                    "TB Terakhir (cm)": lastVisit.tb || "-",
                    "Lingkar Kepala Terakhir (cm)": lastVisit.lk || "-",
                    "Imunisasi Terakhir": lastVisit.imun || "-"
                };
            });

            const wb = XLSX.utils.book_new();
            const wsIbu = XLSX.utils.json_to_sheet(dataIbu);
            const wsAnak = XLSX.utils.json_to_sheet(dataAnak);

            XLSX.utils.book_append_sheet(wb, wsIbu, "Data Ibu Hamil");
            XLSX.utils.book_append_sheet(wb, wsAnak, "Data Anak");

            XLSX.writeFile(wb, "Rekap_Posyandu_KIA.xlsx");
            showToast('File Excel berhasil diunduh!');
        }

        function clearAllData() {
            if(confirm('Yakin hapus semua data?')) {
                DB.mothers = [];
                DB.children = [];
                DB.save();
                location.reload();
            }
        }

        // Init
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
        checkLogin()