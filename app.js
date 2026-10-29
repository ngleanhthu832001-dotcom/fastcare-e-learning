(function(){
      /* ===== Supabase: đăng nhập thật + dữ liệu chung ===== */
      var SUPABASE_URL='https://lmcqcdpzgbdxntwodjed.supabase.co';
      var SUPABASE_KEY='sb_publishable_Hvwz9IQza278-z6j1NAxnQ_Qo1yEkuD';
      var TECH_PWD='FcElearning@2026';
      var LESSON_ID='bai-3-4-van-hoa-phuc-vu';
      var LESSON_XP=120;
      var SURVEY_ID='khao-sat-module-01';
      var SURVEY_XP=60;
      var module1Done=false;
      var sb=null,currentUser=null,userRole='staff',myProfile=null;
      function fmt(n){return Number(n||0).toLocaleString('vi-VN')}
      function initials(name){if(!name)return'?';var p=String(name).trim().split(/\s+/);if(p.length>1){return (p[p.length-2].charAt(0)+p[p.length-1].charAt(0)).toUpperCase()}return p[0].substring(0,2).toUpperCase()}
      function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
      function dotAvatar(url,name){return url?'<img src="'+escapeHtml(url)+'" alt="">':escapeHtml(initials(name))}
      function dbErrorToast(){showToast('Không kết nối được máy chủ, vui lòng thử lại sau.')}
      function authMsg(err){
        var m=(err&&err.message)||'';
        if(m.indexOf('Invalid login credentials')>-1)return 'Email hoặc mật khẩu chưa đúng, vui lòng thử lại.';
        if(m.indexOf('User already registered')>-1||m.indexOf('already been registered')>-1)return 'Email này đã được đăng ký, hãy đăng nhập.';
        if(m.indexOf('Email not confirmed')>-1)return 'Vui lòng kiểm tra email để xác nhận tài khoản.';
        if(m.indexOf('Password should be')>-1)return 'Mật khẩu cần ít nhất 6 ký tự.';
        if(m.indexOf('Unable to validate email')>-1||m.indexOf('Invalid email')>-1)return 'Địa chỉ email chưa hợp lệ.';
        return 'Có lỗi xảy ra, vui lòng thử lại.'+(m?' Chi tiết kỹ thuật: '+m:'');
      }
      function setAuthError(t){var el=document.getElementById('authError');if(el)el.textContent=t||''}
      function unlockApp(){document.body.classList.remove('locked')}
      function lockApp(){document.body.classList.add('locked');currentUser=null;userRole='staff';var an=document.getElementById('adminNav');if(an)an.style.display='none'}
      async function fetchMyProfile(){
        var fields=[
          'full_name,role,department,employee_code,position,start_date,avatar_url,is_approved,is_rejected',
          'full_name,role,department,employee_code,is_approved',
          'full_name,role,department,employee_code'
        ];
        for(var i=0;i<fields.length;i++){
          try{
            var r=await sb.from('profiles').select(fields[i]).eq('id',currentUser.id).single();
            if(r.error)throw r.error;
            return r.data||null;
          }catch(e){/* thử tầng tiếp theo */}
        }
        return null;
      }
      function canModerate(){return userRole==='admin'||userRole==='manager'}
      function applyProfileToUI(profile){
        myProfile=profile||null;
        var metaName=currentUser.user_metadata&&currentUser.user_metadata.full_name;
        var name=(profile&&profile.full_name)||metaName||currentUser.email||'Học viên';
        var first=String(name).trim().split(/\s+/).pop();
        var avEl=document.getElementById('userAvatar');
        if(profile&&profile.avatar_url){avEl.innerHTML='<img src="'+escapeHtml(profile.avatar_url)+'" alt="Ảnh đại diện của '+escapeHtml(name)+'">'}
        else{avEl.textContent=initials(name)}
        document.getElementById('userName').innerHTML=escapeHtml(name)+(currentUser.email?' <span class="u-email">('+escapeHtml(currentUser.email)+')</span>':'');
        document.getElementById('greetingName').textContent='Xin chào, '+first+'!';
        var dt=document.getElementById('demoTag');if(dt)dt.style.display='none';
        var roleEl=document.getElementById('userRole');
        if(profile&&profile.role==='admin'){userRole='admin';roleEl.textContent='Quản trị viên';document.getElementById('adminNav').style.display=''}
        else if(profile&&profile.role==='manager'){userRole='manager';roleEl.textContent='Quản lý';document.getElementById('adminNav').style.display=''}
        else{userRole='staff';roleEl.textContent=(profile&&profile.position)||'Nhân sự FASTCARE'}
        var ps=document.getElementById('permSection');if(ps)ps.hidden=!(profile&&profile.role==='admin');
        var ds=document.getElementById('dirSection');if(ds)ds.hidden=!(profile&&profile.role==='admin');
        var cs=document.getElementById('createSection');if(cs)cs.hidden=!(profile&&profile.role==='admin');
        var p=profile||{};
        document.getElementById('userCode').textContent=p.employee_code||'—';
        document.getElementById('userPosition').textContent=p.position||'—';
        document.getElementById('userDept').textContent=p.department||'—';
        var sd=p.start_date?String(p.start_date).slice(0,10).split('-'):null;
        document.getElementById('userStart').textContent=sd?(sd[2]+'/'+sd[1]+'/'+sd[0]):'—';
      }
      async function refreshMyStats(){
        if(!currentUser)return;
        try{
          var lp=await sb.from('lesson_progress').select('lesson_id,completed,xp_earned,updated_at').eq('user_id',currentUser.id);
          if(lp.error)throw lp.error;
          var qa=await sb.from('quiz_attempts').select('lesson_id,score,total,xp_earned,created_at').eq('user_id',currentUser.id);
          if(qa.error)throw qa.error;
          var rows=lp.data||[],atts=qa.data||[];
          var totalXp=0,completed=0,weekXp=0;
          var weekAgo=Date.now()-7*24*3600*1000;
          rows.forEach(function(r){totalXp+=r.xp_earned||0;if(r.completed)completed++;if(r.updated_at&&new Date(r.updated_at).getTime()>weekAgo)weekXp+=r.xp_earned||0});
          atts.forEach(function(a){totalXp+=a.xp_earned||0;if(a.created_at&&new Date(a.created_at).getTime()>weekAgo)weekXp+=a.xp_earned||0});
          document.getElementById('xpTotal').textContent=fmt(totalXp);
          document.getElementById('xpDelta').textContent='+'+fmt(weekXp)+' tuần này';
          document.getElementById('completedTotal').textContent=completed+'/12';
          document.getElementById('progressNote').textContent='Dữ liệu mới nhất';
          var qT=0,qS=0;atts.forEach(function(a){qT+=a.total||0;qS+=a.score||0});
          var qAvg=document.getElementById('quizAvg'),qNote=document.getElementById('quizAvgNote');
          if(qAvg)qAvg.textContent=atts.length&&qT?Math.round(qS/qT*100)+'%':'—';
          if(qNote)qNote.textContent=atts.length?atts.length+' lượt làm bài':'Chưa có dữ liệu';
          var done=false;
          rows.forEach(function(r){if(r.lesson_id===LESSON_ID&&r.completed)done=true});
          if(done&&!lessonCompleted)completeCurrentLesson();
          atts.forEach(function(a){if(a.lesson_id===SURVEY_ID&&a.score===a.total&&a.total===5)markModule1Done()});
          if(!done){var _cp=document.getElementById('currentProgress');if(_cp)_cp.style.width='0%'}
        }catch(e){/* giữ số liệu hiện tại, không crash */}
      }
      async function saveLessonProgress(){
        if(!currentUser)return false;
        try{
          var r=await sb.from('lesson_progress').upsert({user_id:currentUser.id,lesson_id:LESSON_ID,completed:true,xp_earned:LESSON_XP},{onConflict:'user_id,lesson_id'});
          if(r.error)throw r.error;
          return true;
        }catch(e){dbErrorToast();return false}
      }
      async function recordQuizAttempt(score,total){
        if(!currentUser)return;
        try{
          var r=await sb.from('quiz_attempts').insert({user_id:currentUser.id,lesson_id:LESSON_ID,score:score,total:total,xp_earned:score===total?LESSON_XP:0});
          if(r.error)throw r.error;
        }catch(e){dbErrorToast()}
      }
      function emptyRankHTML(){return '<p class="muted-center">Chưa có dữ liệu — hãy là người đầu tiên học!</p>'}
      async function renderRanking(scope){
        var podium=document.getElementById('rankPodium'),table=document.getElementById('rankTable');
        if(!podium||!table)return;
        podium.innerHTML='<p class="muted-center">Đang tải bảng xếp hạng…</p>';table.innerHTML='';
        try{
          var res=await sb.rpc(scope==='unit'?'get_unit_leaderboard':'get_leaderboard');
          if(res.error)throw res.error;
          var rows=res.data||[];
          if(!rows.length){podium.innerHTML=emptyRankHTML();return}
          var top=rows.slice(0,3),rest=rows.slice(3,10);
          podium.innerHTML=[1,0,2].map(function(i){
            var it=top[i];if(!it)return '';
            var cls=i===0?' first':'';
            if(scope==='unit'){
              return '<div class="podium-card'+cls+'"><div class="medal">'+(i+1)+'</div><strong>'+escapeHtml(it.department||'Chưa rõ')+'</strong><span>'+(it.member_count||0)+' thành viên</span><b>'+fmt(it.total_xp)+' XP</b></div>';
            }
            var you=currentUser&&it.user_id===currentUser.id?' · Bạn':'';
            return '<div class="podium-card'+cls+'"><div class="medal">'+(i+1)+'</div><strong>'+escapeHtml(it.full_name||'Học viên')+you+'</strong><span>'+escapeHtml(it.department||'FASTCARE')+'</span><b>'+fmt(it.total_xp)+' XP</b></div>';
          }).join('');
          var head=scope==='unit'?['Đơn vị','Loại hình','Tổng XP']:['Nhân sự','Đơn vị','Điểm'];
          var body=rest.map(function(it,idx){
            var rank=String(idx+4).padStart(2,'0');
            if(scope==='unit'){
              return '<div class="rank-row"><b>'+rank+'</b><div class="person"><div class="person-dot">'+escapeHtml(initials(it.department))+'</div><div><strong>'+escapeHtml(it.department||'Chưa rõ')+'</strong><span>'+(it.member_count||0)+' thành viên</span></div></div><span class="dept">Đơn vị</span><span class="xp">'+fmt(it.total_xp)+' XP</span></div>';
            }
            var you2=currentUser&&it.user_id===currentUser.id?' · Bạn':'';
            return '<div class="rank-row"><b>'+rank+'</b><div class="person"><div class="person-dot">'+dotAvatar(it.avatar_url,it.full_name)+'</div><div><strong>'+escapeHtml(it.full_name||'Học viên')+you2+'</strong><span>'+escapeHtml(it.department||'FASTCARE')+'</span></div></div><span class="dept">'+escapeHtml(it.department||'—')+'</span><span class="xp">'+fmt(it.total_xp)+'</span></div>';
          }).join('');
          table.innerHTML='<div class="rank-row rank-head"><span>Hạng</span><span>'+head[0]+'</span><span class="dept">'+head[1]+'</span><span class="xp">'+head[2]+'</span></div>'+body;
          table.setAttribute('aria-label',scope==='unit'?'Bảng xếp hạng đơn vị theo tổng XP':'Bảng xếp hạng cá nhân theo điểm XP');
        }catch(e){podium.innerHTML=emptyRankHTML()}
      }
      var createWired=false,impRows=[],impRunning=false;
      function tmpClient(){return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
      async function createAccountOne(row){
        var tc=tmpClient();
        var r=await tc.auth.signUp({email:row.email,password:TECH_PWD,options:{data:{full_name:row.name}}});
        if(r.error)throw r.error;
        var user=r.data&&r.data.user;
        if(!user||!user.id)throw new Error('Không tạo được tài khoản, thử lại sau.');
        if(user.identities&&user.identities.length===0){try{await tc.auth.signOut()}catch(e){}return{existed:true}}
        var unconfirmed=!user.email_confirmed_at&&!(r.data&&r.data.session);
        var upd={full_name:row.name,is_approved:true,is_rejected:false};
        if(row.unit)upd.department=row.unit;
        if(row.position)upd.position=row.position;
        if(row.code)upd.staff_code=row.code;
        if(row.start)upd.start_date=row.start;
        var u=await sb.from('profiles').update(upd).eq('id',user.id);
        try{await tc.auth.signOut()}catch(e){}
        if(u.error)throw new Error('Đã tạo tài khoản nhưng chưa lưu được hồ sơ ('+u.error.message+')');
        return{unconfirmed:unconfirmed};
      }
      function stripVn(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0111/g,'d').replace(/\u0110/g,'D').toLowerCase().trim()}
      function parseDateCell(v){
        if(v===null||v===undefined||v==='')return'';
        if(v instanceof Date){if(isNaN(v.getTime()))return null;return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0')}
        var str=String(v).trim();
        var m=str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
        m=str.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];
        return null;
      }
      function wireCreateSection(){
        if(createWired)return;
        if(!document.getElementById('createForm'))return;
        createWired=true;
        var dl=document.getElementById('unitList');var pf=document.getElementById('pfDept');
        if(dl&&pf){dl.innerHTML='';Array.prototype.forEach.call(pf.options,function(o){if(o.value){var op=document.createElement('option');op.value=o.value;dl.appendChild(op)}})}
        document.getElementById('createForm').addEventListener('submit',async function(e){
          e.preventDefault();
          var msg=document.getElementById('crMsg');var btn=document.getElementById('crBtn');
          var row={name:document.getElementById('crName').value.trim(),email:document.getElementById('crEmail').value.trim().toLowerCase(),unit:document.getElementById('crUnit').value.trim(),position:document.getElementById('crPosition').value.trim(),code:document.getElementById('crCode').value.trim(),start:document.getElementById('crStart').value||''};
          msg.textContent='';btn.disabled=true;btn.textContent='Đang tạo…';
          try{
            var ex=await sb.from('profiles').select('id').eq('email',row.email).maybeSingle();
            if(ex.data){msg.textContent='Email này đã có tài khoản trên web rồi.';msg.style.color='#dc2626'}
            else{
              var res=await createAccountOne(row);
              if(res.existed){msg.textContent='Email này đã có tài khoản trên web rồi.';msg.style.color='#dc2626'}
              else{
                msg.textContent='Đã tạo tài khoản cho '+row.name+' ('+row.email+'). Nhân sự mở web và nhập email này là vào học được ngay.'+(res.unconfirmed?' Lưu ý: tài khoản chưa được xác nhận email — nếu nhân sự không vào được, báo Luke kiểm tra cài đặt Confirm email trong Supabase.':'');
                msg.style.color='#15803d';
                document.getElementById('createForm').reset();
                renderAdmin();
              }
            }
          }catch(err){msg.textContent=authMsg(err);msg.style.color='#dc2626'}
          btn.disabled=false;btn.textContent='Tạo tài khoản';
        });
        document.getElementById('impFile').addEventListener('change',function(){handleImportFile(this.files&&this.files[0])});
      }
      async function handleImportFile(file){
        var box=document.getElementById('impPreview');impRows=[];
        if(!file)return;
        if(!window.XLSX){box.innerHTML='<p class="st-err-t">Chưa tải được thư viện đọc Excel — kiểm tra mạng rồi tải lại trang.</p>';return}
        box.innerHTML='<p class="muted-center">Đang đọc file…</p>';
        try{
          var buf=await file.arrayBuffer();
          var wb=XLSX.read(buf,{type:'array',cellDates:true});
          var ws=wb.Sheets[wb.SheetNames[0]];
          var arr=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
          if(!arr.length)throw new Error('File trống.');
          var head=arr[0].map(stripVn);
          function col(){for(var i=0;i<head.length;i++){for(var j=0;j<arguments.length;j++){if(head[i].indexOf(arguments[j])>-1)return i}}return -1}
          var ci={name:col('ho va ten','ho ten'),email:col('email','e-mail','mail'),unit:col('phong ban','don vi','chi nhanh'),position:col('vi tri','chuc vu','chuc danh'),code:col('ma ns','ma nhan su','ma nv'),start:col('ngay vao')};
          if(ci.name<0||ci.email<0){box.innerHTML='<p class="st-err-t">Không tìm thấy cột "Họ và tên" hoặc "Email" trong file. Kiểm tra lại hàng tiêu đề của file nhé.</p>';return}
          var existing={};
          var pr=await sb.from('profiles').select('email');
          if(!pr.error&&pr.data)pr.data.forEach(function(x){if(x.email)existing[x.email.toLowerCase()]=1});
          var seen={};
          for(var r=1;r<arr.length;r++){
            var rowArr=arr[r];if(!rowArr)continue;
            var name=String(rowArr[ci.name]||'').trim();
            var email=String(rowArr[ci.email]||'').trim().toLowerCase();
            if(!name&&!email)continue;
            var start=ci.start>-1?parseDateCell(rowArr[ci.start]):'';
            var row={name:name,email:email,unit:ci.unit>-1?String(rowArr[ci.unit]||'').trim():'',position:ci.position>-1?String(rowArr[ci.position]||'').trim():'',code:ci.code>-1?String(rowArr[ci.code]||'').trim():'',start:start,status:'ok',msg:''};
            if(!row.name){row.status='err';row.msg='Thiếu họ tên'}
            else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)){row.status='err';row.msg='Email không hợp lệ'}
            else if(start===null){row.status='err';row.msg='Ngày vào không đúng định dạng (dd/mm/yyyy)'}
            else if(seen[row.email]){row.status='dup';row.msg='Trùng email trong file'}
            else if(existing[row.email]){row.status='dup';row.msg='Đã có tài khoản trên web'}
            seen[row.email]=1;
            impRows.push(row);
          }
          renderImpPreview();
        }catch(err){box.innerHTML='<p class="st-err-t">Không đọc được file: '+escapeHtml(err.message||String(err))+'</p>'}
      }
      function renderImpPreview(){
        var box=document.getElementById('impPreview');
        if(!impRows.length){box.innerHTML='<p class="muted-center">Không có dòng dữ liệu nào trong file.</p>';return}
        var ok=impRows.filter(function(x){return x.status==='ok'}).length;
        var fmtD=function(iso){if(!iso)return'—';var pt=iso.split('-');return pt[2]+'/'+pt[1]+'/'+pt[0]};
        var html='<div style="overflow:auto"><table class="imp-table"><thead><tr><th>#</th><th>Họ và tên</th><th>Email</th><th>Đơn vị</th><th>Vị trí</th><th>Mã NS</th><th>Ngày vào</th><th>Trạng thái</th></tr></thead><tbody>';
        impRows.forEach(function(x,i){
          html+='<tr><td>'+(i+1)+'</td><td>'+escapeHtml(x.name||'—')+'</td><td>'+escapeHtml(x.email||'—')+'</td><td>'+escapeHtml(x.unit||'—')+'</td><td>'+escapeHtml(x.position||'—')+'</td><td>'+escapeHtml(x.code||'—')+'</td><td>'+fmtD(x.start)+'</td><td id="impSt'+i+'">'+(x.status==='ok'?'<span class="st-ok-t">Hợp lệ</span>':'<span class="st-err-t">'+escapeHtml(x.msg)+'</span>')+'</td></tr>';
        });
        html+='</tbody></table></div><div class="imp-actions"><button class="primary" type="button" id="impRun"'+(ok?'':' disabled')+'>Tạo '+ok+' tài khoản hợp lệ</button><span id="impProgress" style="font-size:13px;color:var(--muted)"></span></div>';
        box.innerHTML=html;
        document.getElementById('impRun').addEventListener('click',runImport);
      }
      async function runImport(){
        if(impRunning)return;impRunning=true;
        var btn=document.getElementById('impRun');if(btn)btn.disabled=true;
        var prog=document.getElementById('impProgress');
        var targets=[];impRows.forEach(function(x,i){if(x.status==='ok')targets.push({x:x,i:i})});
        var done=0,okCount=0;
        for(var k=0;k<targets.length;k++){
          var t=targets[k];var cell=document.getElementById('impSt'+t.i);
          if(cell)cell.innerHTML='<span>Đang tạo…</span>';
          try{
            var res=await createAccountOne(t.x);
            if(res.existed){if(cell)cell.innerHTML='<span class="st-err-t">Đã có tài khoản — bỏ qua</span>'}
            else{okCount++;if(cell)cell.innerHTML='<span class="st-ok-t">✓ Đã tạo</span>'+(res.unconfirmed?'<span class="st-err-t"> (chưa xác nhận email)</span>':'')}
          }catch(err){if(cell)cell.innerHTML='<span class="st-err-t">✗ '+escapeHtml(authMsg(err))+'</span>'}
          done++;if(prog)prog.textContent='Đã xử lý '+done+'/'+targets.length+' — tạo thành công '+okCount;
        }
        if(prog)prog.textContent='Hoàn tất: tạo thành công '+okCount+'/'+targets.length+' tài khoản. Nhân sự dùng email đã cấp để vào học ngay.';
        impRunning=false;
        renderAdmin();
      }
      async function renderAdmin(){
        var box=document.getElementById('adminTable');
        if(!box)return;
        box.innerHTML='<p class="muted-center">Đang tải danh sách…</p>';
        try{
          var res=await sb.rpc('get_leaderboard');
          if(res.error)throw res.error;
          var rows=res.data||[];
          if(!rows.length){box.innerHTML=emptyRankHTML();return}
          box.innerHTML='<div class="rank-row rank-head"><span>#</span><span>Học viên</span><span class="dept">Đơn vị</span><span class="xp">Tổng XP</span></div>'+rows.map(function(it,idx){
            return '<div class="rank-row"><b>'+(idx+1)+'</b><div class="person"><div class="person-dot">'+dotAvatar(it.avatar_url,it.full_name)+'</div><div><strong>'+escapeHtml(it.full_name||'Học viên')+'</strong><span>'+escapeHtml(it.department||'FASTCARE')+'</span></div></div><span class="dept">'+escapeHtml(it.department||'—')+'</span><span class="xp">'+fmt(it.total_xp)+'</span></div>';
          }).join('');
        }catch(e){box.innerHTML='<p class="muted-center">Chưa tải được danh sách học viên.</p>'}
      }
      var pendingTimer=null;
      function showPending(){
        document.getElementById('pendingOverlay').classList.add('open');
        startPendingWatch();
      }
      function hidePending(){
        document.getElementById('pendingOverlay').classList.remove('open');
        stopPendingWatch();
      }
      function showRejected(){document.getElementById('rejectedOverlay').classList.add('open')}
      function hideRejected(){document.getElementById('rejectedOverlay').classList.remove('open')}
      function stopPendingWatch(){if(pendingTimer){clearInterval(pendingTimer);pendingTimer=null}}
      function startPendingWatch(){
        stopPendingWatch();
        pendingTimer=setInterval(async function(){
          if(!currentUser)return;
          var p=await fetchMyProfile();
          if(p&&(p.is_approved===true||p.role==='admin')){
            hidePending();
            applyProfileToUI(p);
            refreshMyStats();renderRanking('individual');
            if(canModerate()){renderAdmin();renderPendingApprovals()}
            showToast('Tài khoản đã được duyệt, chào mừng bạn!');
          }
        },30000);
      }
      async function renderPendingApprovals(){
        var box=document.getElementById('pendingApprovals');
        var badge=document.getElementById('adminBadge');
        if(!box)return 0;
        try{
          var res=await sb.from('profiles').select('id,full_name,email,department,created_at').eq('is_approved',false).eq('is_rejected',false).order('created_at',{ascending:true});
          if(res.error){res=await sb.from('profiles').select('id,full_name,email,department,created_at').eq('is_approved',false).order('created_at',{ascending:true})}
          if(res.error)throw res.error;
          var rows=res.data||[];
          if(badge){badge.textContent=rows.length;badge.style.display=rows.length?'':'none'}
          renderRejectedList();
          if(!rows.length){box.innerHTML='';return 0}
          box.innerHTML='<div class="leaderboard"><div class="rank-row rank-head"><span>⏳</span><span>Tài khoản chờ duyệt ('+rows.length+')</span><span class="dept">Ngày đăng ký</span><span class="xp"></span></div>'+
            rows.map(function(it){
              var d=it.created_at?new Date(it.created_at).toLocaleDateString('vi-VN'):'—';
              return '<div class="rank-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(null,it.full_name)+'</div><div><strong>'+escapeHtml(it.full_name||'Học viên')+'</strong><span>'+escapeHtml(it.email||'')+(it.department?' · '+escapeHtml(it.department):'')+'</span></div></div><span class="dept">'+d+'</span><span class="xp row-actions"><button class="approve-btn" data-approve="'+it.id+'">Duyệt</button> <button class="reject-btn" data-reject="'+it.id+'">Từ chối</button></span></div>';
            }).join('')+'</div>';
          box.querySelectorAll('[data-approve]').forEach(function(b){
            b.addEventListener('click',function(){approveUser(b.getAttribute('data-approve'),b)});
          });
          box.querySelectorAll('[data-reject]').forEach(function(b){
            b.addEventListener('click',function(){rejectUser(b.getAttribute('data-reject'),b)});
          });
          return rows.length;
        }catch(e){box.innerHTML='';if(badge)badge.style.display='none';return 0}
      }
      async function rejectUser(id,btn){
        if(!confirm('Từ chối tài khoản này? Người này sẽ không vào được hệ thống. Bạn vẫn mở lại được trong danh sách đã từ chối bên dưới.'))return;
        if(btn)btn.disabled=true;
        try{
          var r=await sb.from('profiles').update({is_rejected:true}).eq('id',id);
          if(r.error)throw r.error;
          showToast('Đã từ chối tài khoản');
          renderPendingApprovals();renderAdmin();
          if(userRole==='admin'){renderPermissions();renderDirectory()}
        }catch(e){showToast('Không từ chối được, vui lòng thử lại');if(btn)btn.disabled=false}
      }
      async function renderRejectedList(){
        var box=document.getElementById('rejectedList');
        if(!box)return;
        try{
          var res=await sb.from('profiles').select('id,full_name,email,department,created_at').eq('is_rejected',true).order('created_at',{ascending:true});
          if(res.error)throw res.error;
          var rows=res.data||[];
          if(!rows.length){box.innerHTML='';return}
          box.innerHTML='<div class="leaderboard"><div class="rank-row rank-head"><span>🚫</span><span>Tài khoản đã từ chối ('+rows.length+')</span><span class="dept">Ngày đăng ký</span><span class="xp"></span></div>'+
            rows.map(function(it){
              var d=it.created_at?new Date(it.created_at).toLocaleDateString('vi-VN'):'—';
              return '<div class="rank-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(null,it.full_name)+'</div><div><strong>'+escapeHtml(it.full_name||'Học viên')+'</strong><span>'+escapeHtml(it.email||'')+(it.department?' · '+escapeHtml(it.department):'')+'</span></div></div><span class="dept">'+d+'</span><span class="xp row-actions"><button class="approve-btn" data-approve2="'+it.id+'">Duyệt</button> <button class="restore-btn" data-restore="'+it.id+'">Hoàn tác</button></span></div>';
            }).join('')+'</div>';
          box.querySelectorAll('[data-approve2]').forEach(function(b){
            b.addEventListener('click',function(){restoreUser(b.getAttribute('data-approve2'),b,true)});
          });
          box.querySelectorAll('[data-restore]').forEach(function(b){
            b.addEventListener('click',function(){restoreUser(b.getAttribute('data-restore'),b,false)});
          });
        }catch(e){box.innerHTML=''}
      }
      async function restoreUser(id,btn,approve){
        if(btn)btn.disabled=true;
        try{
          var upd=approve?{is_rejected:false,is_approved:true}:{is_rejected:false};
          var r=await sb.from('profiles').update(upd).eq('id',id);
          if(r.error)throw r.error;
          showToast(approve?'Đã duyệt tài khoản':'Đã hoàn tác từ chối — tài khoản quay lại danh sách chờ duyệt');
          renderPendingApprovals();renderAdmin();
          if(userRole==='admin'){renderPermissions();renderDirectory()}
        }catch(e){showToast('Không thực hiện được, vui lòng thử lại');if(btn)btn.disabled=false}
      }
      async function approveUser(id,btn){
        if(btn)btn.disabled=true;
        try{
          var r=await sb.from('profiles').update({is_approved:true}).eq('id',id);
          if(r.error)throw r.error;
          showToast('Đã duyệt tài khoản');
          renderPendingApprovals();renderAdmin();
          if(userRole==='admin'){renderPermissions();renderDirectory()}
        }catch(e){showToast('Không duyệt được, vui lòng thử lại');if(btn)btn.disabled=false}
      }
      var permRows=[],permWired=false;
      async function renderPermissions(){
        var sec=document.getElementById('permSection');
        var box=document.getElementById('permTable');
        if(!sec||!box||userRole!=='admin')return;
        try{
          var res=await sb.from('profiles').select('id,full_name,email,department,employee_code,role,is_approved,is_rejected,created_at').order('full_name',{ascending:true});
          if(res.error)throw res.error;
          permRows=res.data||[];
          var unitSel=document.getElementById('permUnit');
          var cur=unitSel.value;
          var units=[];
          permRows.forEach(function(p){if(p.department&&units.indexOf(p.department)<0)units.push(p.department)});
          units.sort();
          unitSel.innerHTML='<option value="">Tất cả đơn vị</option>'+units.map(function(u){return '<option'+(u===cur?' selected':'')+'>'+escapeHtml(u)+'</option>'}).join('');
          if(!permWired){
            permWired=true;
            document.getElementById('permSearch').addEventListener('input',renderPermRows);
            unitSel.addEventListener('change',renderPermRows);
            box.addEventListener('change',function(e){
              var s=e.target&&e.target.closest?e.target.closest('[data-role-for]'):null;
              if(!s)return;
              changeUserRole(s.getAttribute('data-role-for'),s.value,s);
            });
            box.addEventListener('click',function(e){
              var b=e.target&&e.target.closest?e.target.closest('[data-delperm]'):null;
              if(!b)return;
              var p=null;permRows.forEach(function(x){if(x.id===b.getAttribute('data-delperm'))p=x});
              if(p)deleteAccount(p,b);
            });
          }
          renderPermRows();
          var prb=document.getElementById('permReload');
          if(prb&&!prb.dataset.wired){prb.dataset.wired='1';prb.addEventListener('click',async function(){await renderPermissions();showToast('Đã tải lại danh sách tài khoản')})}
        }catch(e){box.innerHTML='<p class="muted-center">Chưa tải được danh sách tài khoản.</p>'}
      }
      function permStatus(p){
        if(p.is_rejected)return '<span class="status-chip st-rejected">Đã từ chối</span>';
        if(p.is_approved)return '<span class="status-chip st-ok">Đang hoạt động</span>';
        return '<span class="status-chip st-pending">Chờ duyệt</span>';
      }
      function renderPermRows(){
        var box=document.getElementById('permTable');
        if(!box)return;
        var q=(document.getElementById('permSearch').value||'').toLowerCase();
        var u=document.getElementById('permUnit').value;
        var rows=permRows.filter(function(p){
          if(u&&p.department!==u)return false;
          if(q&&(p.full_name||'').toLowerCase().indexOf(q)<0&&(p.email||'').toLowerCase().indexOf(q)<0)return false;
          return true;
        });
        if(!rows.length){box.innerHTML='<p class="muted-center">Không có tài khoản nào khớp.</p>';return}
        box.innerHTML='<div class="rank-row rank-head perm-row"><span>•</span><span>Tài khoản ('+rows.length+')</span><span class="dept">Trạng thái</span><span class="xp">Quyền</span><span class="xp">Thao tác</span></div>'+rows.map(function(p){
          var self=p.id===currentUser.id;
          var opts=[['staff','Nhân viên'],['manager','Quản lý'],['admin','Quản trị viên']].map(function(o){
            return '<option value="'+o[0]+'"'+(p.role===o[0]?' selected':'')+'>'+o[1]+'</option>';
          }).join('');
          return '<div class="rank-row perm-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(null,p.full_name)+'</div><div><strong>'+escapeHtml(p.full_name||'Học viên')+(self?' (bạn)':'')+'</strong><span>'+escapeHtml(p.email||'')+(p.department?' · '+escapeHtml(p.department):'')+'</span></div></div><span class="dept">'+permStatus(p)+'</span><span class="xp"><select class="role-select" data-role-for="'+p.id+'"'+(self?' disabled title="Không thể đổi quyền của chính bạn"':'')+'>'+opts+'</select></span><span class="xp">'+(self?'<span style="font-size:12px;color:var(--muted);font-weight:600">Bạn</span>':'<button class="del-btn" data-delperm="'+p.id+'">Xoá tài khoản</button>')+'</span></div>';
        }).join('');
      }
      async function changeUserRole(id,newRole,sel){
        var p=null;permRows.forEach(function(x){if(x.id===id)p=x});
        var oldRole=p?p.role:'staff';
        if(id===currentUser.id){sel.value=oldRole;showToast('Không thể đổi quyền của chính bạn');return}
        if(newRole==='admin'&&!confirm('Cấp quyền Quản trị viên cho '+(p?p.full_name:'tài khoản này')+'? Người này sẽ có toàn quyền quản trị hệ thống.')){sel.value=oldRole;return}
        if(oldRole==='admin'&&newRole!=='admin'&&!confirm('Hạ quyền Quản trị viên của '+(p?p.full_name:'tài khoản này')+'?')){sel.value=oldRole;return}
        sel.disabled=true;
        try{
          var r=await sb.from('profiles').update({role:newRole}).eq('id',id);
          if(r.error)throw r.error;
          if(p)p.role=newRole;
          showToast('Đã cập nhật quyền cho '+(p?p.full_name:'tài khoản'));
        }catch(e){sel.value=oldRole;showToast('Không đổi quyền được, vui lòng thử lại')}
        sel.disabled=false;
      }
      var dirRows=[],dirWired=false,dirRegEmails={},dirWebOnly=[];
      async function renderDirectory(){
        var box=document.getElementById('dirTable');
        if(!box||userRole!=='admin')return;
        try{
          var res=await sb.rpc('get_staff_directory');
          if(res.error)throw res.error;
          dirRows=res.data||[];
          var pr=await sb.from('profiles').select('email,full_name,staff_code,position,department,start_date');
          if(!pr.error){dirRegEmails={};(pr.data||[]).forEach(function(x){if(x.email)dirRegEmails[x.email.toLowerCase()]=true});
            var dirEmails={};dirRows.forEach(function(d){if(d.email)dirEmails[d.email.toLowerCase()]=1});
            dirWebOnly=(pr.data||[]).filter(function(x){return x.email&&!dirEmails[x.email.toLowerCase()]}).map(function(x){return{full_name:x.full_name,email:x.email,employee_code:x.staff_code,position:x.position,department:x.department,start_date:x.start_date,web:true}});
          }
          var unitSel=document.getElementById('dirUnit');
          var cur=unitSel.value;
          var units=[];
          dirRows.forEach(function(p){if(p.department&&units.indexOf(p.department)<0)units.push(p.department)});
          units.sort();
          unitSel.innerHTML='<option value="">Tất cả đơn vị</option>'+units.map(function(u){return '<option'+(u===cur?' selected':'')+'>'+escapeHtml(u)+'</option>'}).join('');
          if(!dirWired){
            dirWired=true;
            document.getElementById('dirSearch').addEventListener('input',renderDirRows);
            unitSel.addEventListener('change',renderDirRows);
            document.getElementById('dirReload').addEventListener('click',async function(){await renderDirectory();showToast('Đã tải lại danh bạ từ database')});
          }
          wireCreateSection();
          renderDirRows();
        }catch(e){box.innerHTML='<p class="muted-center">Chưa tải được danh bạ. Nếu đây là lần đầu dùng mục này, hãy chạy bản cập nhật database mới nhất (file SQL Luke gửi) rồi tải lại trang.</p>'}
      }
      function renderDirRows(){
        var box=document.getElementById('dirTable');
        if(!box)return;
        var q=(document.getElementById('dirSearch').value||'').toLowerCase();
        var u=document.getElementById('dirUnit').value;
        var rows=dirRows.concat(dirWebOnly).filter(function(p){
          if(u&&p.department!==u)return false;
          if(q&&(p.full_name||'').toLowerCase().indexOf(q)<0&&(p.email||'').toLowerCase().indexOf(q)<0&&(p.employee_code||'').toLowerCase().indexOf(q)<0)return false;
          return true;
        });
        var reg=0;dirRows.forEach(function(p){if(dirRegEmails[(p.email||'').toLowerCase()])reg++});
        document.getElementById('dirSummary').textContent='Tổng '+dirRows.length+' người trong danh bạ · '+reg+' đã có tài khoản · '+(dirRows.length-reg)+' chưa đăng ký'+(dirWebOnly.length?' · cộng '+dirWebOnly.length+' tài khoản tạo trực tiếp trên web':'');
        if(!rows.length){box.innerHTML='<p class="muted-center">Không có ai khớp.</p>';return}
        box.innerHTML='<div class="rank-row rank-head"><span>•</span><span>Nhân sự ('+rows.length+')</span><span class="dept">Đơn vị</span><span class="xp">Trạng thái</span></div>'+rows.map(function(p){
          var has=p.web?true:!!dirRegEmails[(p.email||'').toLowerCase()];
          var sdp=p.start_date?String(p.start_date).slice(0,10).split('-'):null;
          var meta=(p.employee_code?p.employee_code+' · ':'')+(p.position||'')+(sdp?' · Vào '+sdp[2]+'/'+sdp[1]+'/'+sdp[0]:'')+(p.web?' · Tạo trên web':'');
          return '<div class="rank-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(null,p.full_name)+'</div><div><strong>'+escapeHtml(p.full_name||'Nhân sự')+'</strong><span>'+escapeHtml(p.email||'')+(meta?' · '+escapeHtml(meta):'')+'</span></div></div><span class="dept">'+escapeHtml(p.department||'—')+'</span><span class="xp">'+(has?'<span class="status-chip st-ok">Đã có tài khoản</span>':'<span class="status-chip st-pending">Chưa đăng ký</span>')+'</span></div>';
        }).join('');
      }
      var lastUid=null;
      async function deleteAccount(p,btn){
        var label=(p.full_name||'tài khoản này')+' ('+(p.email||'')+')';
        if(!confirm('Xoá tài khoản '+label+'?\n\nToàn bộ tiến trình học, điểm XP và lượt làm bài của người này sẽ bị xoá vĩnh viễn. Người này muốn dùng lại phải ĐĂNG KÝ LẠI từ đầu bằng email.'))return;
        if(!confirm('Xác nhận lần cuối: xoá hẳn tài khoản '+label+'?'))return;
        if(btn)btn.disabled=true;
        try{
          var r=await sb.rpc('admin_delete_user',{target_id:p.id});
          if(r.error)throw r.error;
          showToast('Đã xoá tài khoản '+label);
          renderAdmin();
          renderPendingApprovals();
          if(userRole==='admin'){renderPermissions();renderDirectory()}
        }catch(e){
          var m=(e&&e.message)||'';
          if(m.indexOf('admin_delete_user')>-1||m.indexOf('does not exist')>-1||m.indexOf('404')>-1){showToast('Chưa xoá được — database chưa có chức năng xoá. Hãy chạy file SQL v10 Luke gửi rồi thử lại.')}
          else{showToast('Không xoá được tài khoản, vui lòng thử lại')}
          if(btn)btn.disabled=false;
        }
      }
      async function handleSession(session){
        var _uid=session&&session.user?session.user.id:null;
        if(lastUid!==null&&_uid!==lastUid){location.reload();return}
        if(_uid)lastUid=_uid;
        if(session&&session.user){
          currentUser=session.user;
          unlockApp();
          var profile=await fetchMyProfile();
          applyProfileToUI(profile);
          if(profile&&profile.role!=='admin'&&profile.is_rejected===true){
            showRejected();return;
          }
          hideRejected();
          if(profile&&profile.role!=='admin'&&profile.is_approved===false){
            showPending();return;
          }
          hidePending();
          refreshMyStats();
          renderRanking('individual');
          if(canModerate()){renderAdmin();var _n=await renderPendingApprovals();if(_n>0)showToast('Có '+_n+' tài khoản đang chờ bạn duyệt');if(userRole==='admin'){renderPermissions();renderDirectory()}}
        }else{
          hideRejected();hidePending();lockApp();
        }
      }
      function initAuth(){
        if(!window.supabase){setAuthError('Không tải được thư viện đăng nhập, vui lòng kiểm tra mạng rồi tải lại trang.');return}
        sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
        var tabs=document.querySelectorAll('[data-authmode]');
        tabs.forEach(function(t){t.addEventListener('click',function(){
          tabs.forEach(function(x){x.classList.remove('active')});t.classList.add('active');
          var mode=t.getAttribute('data-authmode');
          document.getElementById('loginForm').hidden=mode!=='login';
          document.getElementById('signupForm').hidden=mode!=='signup';
          setAuthError('');
        })});
        var loginEmailEl=document.getElementById('loginEmail');
        loginEmailEl.addEventListener('input',function(){
          var w=document.getElementById('loginPassWrap');
          if(w&&!w.hidden){w.hidden=true;document.getElementById('loginPassword').value='';document.getElementById('loginHint').textContent='Tài khoản do FASTCARE cấp: chỉ cần nhập email là vào học ngay, không cần mật khẩu.';document.getElementById('loginBtn').textContent='Vào học ngay'}
        });
        document.getElementById('loginForm').addEventListener('submit',async function(e){
          e.preventDefault();setAuthError('');
          var btn=document.getElementById('loginBtn');var wrap=document.getElementById('loginPassWrap');
          var email=loginEmailEl.value.trim();btn.disabled=true;
          if(!wrap){
            btn.textContent='Đang đăng nhập…';
            try{
              var ro=await sb.auth.signInWithPassword({email:email,password:document.getElementById('loginPassword').value});
              if(ro.error)throw ro.error;
            }catch(err){setAuthError(authMsg(err))}
            btn.disabled=false;btn.textContent='Đăng nhập';
            return;
          }
          try{
            if(wrap.hidden){
              btn.textContent='Đang vào…';
              var r=await sb.auth.signInWithPassword({email:email,password:TECH_PWD});
              if(r.error){
                wrap.hidden=false;
                document.getElementById('loginHint').textContent='Tài khoản này dùng mật khẩu riêng — nhập mật khẩu của bạn để tiếp tục.';
                btn.disabled=false;btn.textContent='Đăng nhập';
                document.getElementById('loginPassword').focus();
                return;
              }
            }else{
              btn.textContent='Đang đăng nhập…';
              var r2=await sb.auth.signInWithPassword({email:email,password:document.getElementById('loginPassword').value});
              if(r2.error)throw r2.error;
            }
          }catch(err){setAuthError(authMsg(err))}
          btn.disabled=false;btn.textContent=wrap.hidden?'Vào học ngay':'Đăng nhập';
        });
        document.getElementById('signupForm').addEventListener('submit',async function(e){
          e.preventDefault();setAuthError('');
          var btn=document.getElementById('signupBtn');btn.disabled=true;btn.textContent='Đang tạo…';
          try{
            var r=await sb.auth.signUp({email:document.getElementById('signupEmail').value.trim(),password:document.getElementById('signupPassword').value,options:{data:{full_name:document.getElementById('signupName').value.trim()}}});
            if(r.error)throw r.error;
            if(r.data&&!r.data.session){setAuthError('Vui lòng kiểm tra email để xác nhận tài khoản.')}
            try{
              var _nm=document.getElementById('signupName').value.trim();
              var _em=document.getElementById('signupEmail').value.trim();
              fetch('https://formsubmit.co/ajax/ngleanhthu832001@gmail.com',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({_subject:'[FASTCARE E-learning] Tai khoan moi can duyet',name:_nm,email:_em,message:'Nhan su "'+_nm+'" ('+_em+') vua dang ky tai khoan luc '+new Date().toLocaleString('vi-VN')+'. Vui long vao muc Quan tri tren web de duyet.'})}).catch(function(){});
            }catch(_e){}
          }catch(err){setAuthError(authMsg(err))}
          btn.disabled=false;btn.textContent='Tạo tài khoản';
        });
        document.getElementById('logoutBtn').addEventListener('click',async function(){try{await sb.auth.signOut()}catch(e){lockApp()}});
        document.getElementById('pendingLogout').addEventListener('click',async function(){hidePending();try{await sb.auth.signOut()}catch(e){lockApp()}});
        document.getElementById('rejectedLogout').addEventListener('click',async function(){hideRejected();try{await sb.auth.signOut()}catch(e){lockApp()}});
        function renderPfAvatar(url,name){var el=document.getElementById('pfAvatarPreview');if(!el)return;if(url){el.innerHTML='<img src="'+escapeHtml(url)+'" alt="Ảnh đại diện">'}else{el.textContent=initials(name||'HV')}}
        function openProfile(){
          if(!currentUser)return;
          var p=myProfile||{};
          var metaName=currentUser.user_metadata&&currentUser.user_metadata.full_name;
          document.getElementById('pfName').value=p.full_name||metaName||'';
          document.getElementById('pfDept').value=p.department||'';
          document.getElementById('pfEmail').value=currentUser.email||'';
          document.getElementById('pfCode').value=p.employee_code||'';
          document.getElementById('pfPosition').value=p.position||'';
          var sd=p.start_date?String(p.start_date).slice(0,10).split('-'):null;
          document.getElementById('pfStart').value=sd?(sd[2]+'/'+sd[1]+'/'+sd[0]):'';
          var matched=!!p.employee_code;
          document.getElementById('pfDept').disabled=matched;
          document.getElementById('pfDirHint').hidden=!matched;
          renderPfAvatar(p.avatar_url,p.full_name||metaName);
          document.getElementById('profileModal').classList.add('open');
        }
        function closeProfile(){document.getElementById('profileModal').classList.remove('open')}
        var pb=document.getElementById('profileBlock');
        if(pb){pb.addEventListener('click',openProfile);pb.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openProfile()}})}
        document.getElementById('profileClose').addEventListener('click',closeProfile);
        document.getElementById('profileCancel').addEventListener('click',closeProfile);
        document.getElementById('profileModal').addEventListener('click',function(e){if(e.target===this)closeProfile()});
        document.getElementById('profileSave').addEventListener('click',async function(){
          if(!currentUser)return;
          var btn=this;btn.disabled=true;btn.textContent='Đang lưu…';
          try{
            var upd={full_name:document.getElementById('pfName').value.trim()};
            var deptEl=document.getElementById('pfDept');
            if(!deptEl.disabled)upd.department=deptEl.value||null;
            var r=await sb.from('profiles').update(upd).eq('id',currentUser.id);
            if(r.error)throw r.error;
            applyProfileToUI(await fetchMyProfile());
            closeProfile();showToast('Đã lưu thông tin cá nhân');
          }catch(e){showToast('Không lưu được, vui lòng thử lại')}
          btn.disabled=false;btn.textContent='Lưu thay đổi';
        });
        document.getElementById('avatarChangeBtn').addEventListener('click',function(){document.getElementById('avatarInput').click()});
        document.getElementById('avatarInput').addEventListener('change',async function(){
          var f=this.files&&this.files[0];if(!f||!currentUser)return;
          if(f.size>2*1024*1024){showToast('Ảnh quá lớn, hãy chọn ảnh dưới 2MB');this.value='';return}
          showToast('Đang tải ảnh lên…');
          try{
            var ext=(f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
            var path=currentUser.id+'/avatar.'+ext;
            var up=await sb.storage.from('avatars').upload(path,f,{upsert:true,contentType:f.type});
            if(up.error)throw up.error;
            var pub=sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
            var r2=await sb.from('profiles').update({avatar_url:pub}).eq('id',currentUser.id);
            if(r2.error)throw r2.error;
            applyProfileToUI(await fetchMyProfile());
            renderPfAvatar(pub+'?t='+Date.now(),myProfile&&myProfile.full_name);
            showToast('Đã đổi ảnh đại diện');
          }catch(e){showToast('Không tải được ảnh, vui lòng thử lại')}
          this.value='';
        });
        sb.auth.onAuthStateChange(function(evt,session){handleSession(session)});
        sb.auth.getSession().then(function(r){handleSession(r.data&&r.data.session)}).catch(function(){});
      }
      initAuth();
      var views = document.querySelectorAll('.view');
      var navButtons = document.querySelectorAll('[data-view]');
      function switchView(id){
        views.forEach(function(v){v.classList.toggle('active',v.id===id)});
        navButtons.forEach(function(b){b.classList.toggle('active',b.getAttribute('data-view')===id)});
        window.scrollTo({top:0,behavior:'smooth'});
      }
      navButtons.forEach(function(btn){btn.addEventListener('click',function(){var v=btn.getAttribute('data-view');switchView(v);if(v==='admin'&&canModerate()){renderPendingApprovals();if(userRole==='admin'){renderPermissions();renderDirectory()}}})});
      document.querySelectorAll('[data-goto]').forEach(function(btn){btn.addEventListener('click',function(){switchView(btn.getAttribute('data-goto'))})});

      var overlay=document.getElementById('lessonOverlay');
      var lastFocus=null;
      var lessonCompleted=false;
      var nextLessonMode=false;
      function renderNextLesson(){
        nextLessonMode=true;
        document.querySelector('.lesson').classList.add('next-mode');
        document.getElementById('lessonTopLabel').textContent='Bài 1/3 · Chính sách & quy định chung';
        document.getElementById('lessonTitle').textContent='Quy định tại cửa hàng & chuẩn tác phong';
        document.getElementById('lessonSummary').textContent='Tác phong thống nhất giúp khách hàng nhận ra sự chuyên nghiệp của FASTCARE ngay từ lần tiếp xúc đầu tiên.';
        document.getElementById('keypoints').innerHTML='<div class="point"><b>01 · Đúng giờ</b><span>Có mặt và sẵn sàng trước giờ nhận ca.</span></div><div class="point"><b>02 · Đúng hình ảnh</b><span>Đồng phục gọn gàng, bảng tên rõ ràng.</span></div><div class="point"><b>03 · Đúng quy trình</b><span>Chào hỏi, tiếp nhận và bàn giao đủ bước.</span></div>';
        document.getElementById('lessonQuiz').style.display='none';
        document.getElementById('nextLessonPanel').classList.add('show');
        var video=document.getElementById('storeConductVideo');
        if(!video.src)video.src='https://www.youtube-nocookie.com/embed/DhO2ii8qRUs';
      }
      function openLesson(btn,openNext){
        lastFocus=btn;
        if(openNext||lessonCompleted)renderNextLesson();
        overlay.classList.add('open');document.body.style.overflow='hidden';
        document.getElementById('closeLesson').focus();
      }
      document.querySelectorAll('.open-lesson').forEach(function(btn){btn.addEventListener('click',function(){openLesson(btn,false)})});
      function closeLesson(){overlay.classList.remove('open');document.body.style.overflow='';if(lastFocus&&!lastFocus.disabled)lastFocus.focus()}
      document.getElementById('closeLesson').addEventListener('click',closeLesson);
      var welcomeOverlay=document.getElementById('welcomeOverlay');
      var m1=document.getElementById('module1Card');
      function openWelcome(){if(!welcomeOverlay)return;welcomeOverlay.classList.add('open');showSlide(0);document.body.style.overflow='hidden';var c=document.getElementById('closeWelcome');if(c)c.focus()}
      function closeWelcome(){if(!welcomeOverlay)return;welcomeOverlay.classList.remove('open');document.body.style.overflow='';if(m1)m1.focus()}
      if(m1){m1.addEventListener('click',openWelcome);m1.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openWelcome()}})}
      var cw=document.getElementById('closeWelcome');if(cw)cw.addEventListener('click',closeWelcome);
      var wd=document.getElementById('welcomeDone');if(wd)wd.addEventListener('click',closeWelcome);
      if(welcomeOverlay)welcomeOverlay.addEventListener('click',function(e){if(e.target===welcomeOverlay)closeWelcome()});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&welcomeOverlay&&welcomeOverlay.classList.contains('open'))closeWelcome()});
      var deckSlides=welcomeOverlay?welcomeOverlay.querySelectorAll('.deck-slide'):[];var dotsWrap=document.getElementById('deckDots');if(dotsWrap&&welcomeOverlay){dotsWrap.innerHTML='';deckSlides.forEach(function(_,j){var b=document.createElement('button');b.type='button';b.className='deck-dot'+(j===0?' active':'');b.setAttribute('aria-label','Slide '+(j+1));b.addEventListener('click',function(){showSlide(j)});dotsWrap.appendChild(b)})}var deckDots=dotsWrap?dotsWrap.querySelectorAll('.deck-dot'):[];var deckCount=document.getElementById('deckCount');var deckIdx=0;
      function showSlide(i){if(!deckSlides.length)return;deckIdx=Math.max(0,Math.min(deckSlides.length-1,i));deckSlides.forEach(function(sl,j){sl.classList.toggle('active',j===deckIdx)});deckDots.forEach(function(d,j){d.classList.toggle('active',j===deckIdx)});if(deckCount)deckCount.textContent=(deckIdx+1)+' / '+deckSlides.length;var pv=document.getElementById('deckPrev');var nx=document.getElementById('deckNext');if(pv)pv.disabled=deckIdx===0;if(nx)nx.disabled=deckIdx===deckSlides.length-1}
      var dp=document.getElementById('deckPrev');if(dp)dp.addEventListener('click',function(){showSlide(deckIdx-1)});
      var dn=document.getElementById('deckNext');if(dn)dn.addEventListener('click',function(){showSlide(deckIdx+1)});
      var deckBody=document.querySelector('.lesson-body.deck');if(deckBody){deckBody.addEventListener('click',function(e){var t=e.target;if(t&&t.classList&&t.classList.contains('deck-info')){var z=document.createElement('div');z.className='deck-zoomed';var im=document.createElement('img');im.src=t.src;im.alt=t.alt||'';z.appendChild(im);z.addEventListener('click',function(){z.remove()});document.body.appendChild(z)}})}
      if(welcomeOverlay){var tx=null;welcomeOverlay.addEventListener('touchstart',function(e){tx=e.changedTouches[0].clientX},{passive:true});welcomeOverlay.addEventListener('touchend',function(e){if(tx===null)return;var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>40){showSlide(deckIdx+(dx<0?1:-1))}tx=null},{passive:true})}
      document.addEventListener('keydown',function(e){if(welcomeOverlay&&welcomeOverlay.classList.contains('open')){if(e.key==='ArrowRight')showSlide(deckIdx+1);if(e.key==='ArrowLeft')showSlide(deckIdx-1)}});
      overlay.addEventListener('click',function(e){if(e.target===overlay)closeLesson()});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&overlay.classList.contains('open'))closeLesson()});
      document.querySelectorAll('.question').forEach(function(q){q.querySelectorAll('.option').forEach(function(opt,idx){opt.addEventListener('click',function(){q.querySelectorAll('.option').forEach(function(o){o.classList.remove('selected')});opt.classList.add('selected');q.dataset.selected=idx})})});
      function completeCurrentLesson(){
        if(lessonCompleted)return;
        lessonCompleted=true;
        saveLessonProgress().then(function(){refreshMyStats()});
        var currentCourse=document.getElementById('currentCourse');
        currentCourse.classList.add('completed');
        document.getElementById('currentProgress').style.width='100%';
        var currentAction=document.getElementById('currentCourseAction');
        currentAction.disabled=true;
        currentAction.setAttribute('aria-label','Bài học đã hoàn thành');
        currentAction.innerHTML='<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
        var nextAction=document.getElementById('nextCourseAction');
        var unlockedAction=nextAction.cloneNode(true);
        unlockedAction.removeAttribute('data-toast');
        unlockedAction.setAttribute('aria-label','Mở bài học tiếp theo');
        unlockedAction.innerHTML='<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>';
        nextAction.parentNode.replaceChild(unlockedAction,nextAction);
        unlockedAction.addEventListener('click',function(){openLesson(unlockedAction,true)});
        var currentModule=document.getElementById('currentModule');
        currentModule.classList.remove('current');currentModule.classList.add('done');
        currentModule.querySelector('.module-num').textContent='✓';
        document.getElementById('currentModuleStatus').textContent='HOÀN THÀNH';
        document.getElementById('nextModule').classList.add('unlocked');
        document.getElementById('nextModuleStatus').textContent='BÀI 1/3 ĐÃ MỞ';
        document.getElementById('routeContinue').textContent='Bắt đầu mô-đun 3';
        document.getElementById('heroEyebrow').textContent='Bài tiếp theo đã mở';
        document.getElementById('heroTitle').textContent='Chuẩn tác phong tạo nên sự chuyên nghiệp.';
        document.getElementById('heroSummary').textContent='Bắt đầu mô-đun 3: các quy định cần nhớ khi làm việc tại cửa hàng FASTCARE.';
        document.getElementById('heroAction').innerHTML='Bài tiếp theo · 8 phút <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>';
      }
      document.getElementById('submitQuiz').addEventListener('click',function(){
        var questions=document.querySelectorAll('.question');var answered=0,score=0;
        questions.forEach(function(q){
          var selected=q.dataset.selected;if(selected!==undefined){answered++}
          q.querySelectorAll('.option').forEach(function(o,i){o.classList.remove('correct','wrong');if(i===Number(q.dataset.answer))o.classList.add('correct');if(selected!==undefined&&i===Number(selected)&&i!==Number(q.dataset.answer))o.classList.add('wrong')});
          if(Number(selected)===Number(q.dataset.answer))score++;
        });
        var result=document.getElementById('quizResult');
        var successCard=document.getElementById('successCard');
        successCard.classList.remove('show');
        if(answered<questions.length){result.textContent='Hãy trả lời đủ '+questions.length+' câu.';return}
        result.textContent='Kết quả: '+score+'/'+questions.length+' câu đúng';
        recordQuizAttempt(score,questions.length);
        if(score===questions.length){
          successCard.classList.add('show');
          document.getElementById('submitQuiz').style.display='none';
          document.getElementById('completionActions').classList.add('show');
          completeCurrentLesson();
          successCard.scrollIntoView({behavior:'smooth',block:'nearest'});
          showToast('Xuất sắc! Đã cộng 120 XP và mở bài tiếp theo');
        }else{
          document.getElementById('submitQuiz').textContent='Nộp lại bài kiểm tra';
          showToast('Bạn có thể chọn lại đáp án rồi nộp lại');
        }
      });
      function markModule1Done(){
        if(module1Done)return;module1Done=true;
        var m1c=document.getElementById('module1Card');
        if(m1c){m1c.classList.add('done');var mn=m1c.querySelector('.module-num');if(mn)mn.textContent='\u2713'}
        var st=document.getElementById('module1Status');if(st)st.textContent='HO\u00c0N TH\u00c0NH';
      }
      document.querySelectorAll('.sq-question').forEach(function(q){q.querySelectorAll('.sq-option').forEach(function(opt,idx){opt.addEventListener('click',function(){q.querySelectorAll('.sq-option').forEach(function(o){o.classList.remove('selected')});opt.classList.add('selected');q.dataset.selected=idx})})});
      document.getElementById('submitSurvey').addEventListener('click',async function(){
        var qs=document.querySelectorAll('.sq-question');var answered=0,score=0;
        qs.forEach(function(q){
          var selected=q.dataset.selected;if(selected!==undefined){answered++}
          q.querySelectorAll('.sq-option').forEach(function(o,i){o.classList.remove('correct','wrong');if(i===Number(q.dataset.answer))o.classList.add('correct');if(selected!==undefined&&i===Number(selected)&&i!==Number(q.dataset.answer))o.classList.add('wrong')});
          if(Number(selected)===Number(q.dataset.answer))score++;
        });
        var result=document.getElementById('surveyResult');
        if(answered<qs.length){result.textContent='Hãy trả lời đủ '+qs.length+' câu.';return}
        result.textContent='Kết quả: '+score+'/'+qs.length+' câu đúng';
        if(currentUser){try{var r=await sb.from('quiz_attempts').insert({user_id:currentUser.id,lesson_id:SURVEY_ID,score:score,total:qs.length,xp_earned:score===qs.length?SURVEY_XP:0});if(r.error)throw r.error}catch(e){dbErrorToast()}}
        var sBtn=document.getElementById('submitSurvey');
        if(score===qs.length){
          markModule1Done();refreshMyStats();
          sBtn.disabled=true;sBtn.textContent='Đã hoàn thành';
          showToast('Xuất sắc! Đã cộng 60 XP và hoàn thành mô-đun 1');
        }else{
          sBtn.textContent='Nộp lại bài khảo sát';
          showToast('Bạn có thể chọn lại đáp án rồi nộp lại');
        }
      });
      document.getElementById('nextLesson').addEventListener('click',function(){renderNextLesson();document.querySelector('.lesson').scrollTo({top:0,behavior:'smooth'});showToast('Đã mở bài tiếp theo')});
      document.getElementById('backToRoute').addEventListener('click',function(){closeLesson();switchView('route')});
      document.getElementById('startNextVideo').addEventListener('click',function(){closeLesson();switchView('route')});

      document.querySelectorAll('.segmented').forEach(function(group){group.querySelectorAll('button').forEach(function(btn){btn.addEventListener('click',function(){
        group.querySelectorAll('button').forEach(function(b){b.classList.remove('active');if(group.getAttribute('data-group')==='scope')b.setAttribute('aria-pressed','false')});
        btn.classList.add('active');
        if(group.getAttribute('data-group')==='scope'){
          btn.setAttribute('aria-pressed','true');
          renderRanking(btn.getAttribute('data-scope'));
        }
        showToast('Đã chuyển sang '+btn.textContent.toLowerCase());
      })})});
      var toast=document.getElementById('toast');var toastTimer;
      function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.classList.remove('show')},2300)}
      document.querySelectorAll('[data-toast]').forEach(function(btn){btn.addEventListener('click',function(){showToast(btn.getAttribute('data-toast'))})});

      var reminder=document.getElementById('reminderPanel');
      document.getElementById('notifyBtn').addEventListener('click',function(e){e.stopPropagation();reminder.classList.toggle('open')});
      document.getElementById('reminderClose').addEventListener('click',function(){reminder.classList.remove('open')});
      document.addEventListener('click',function(e){if(reminder.classList.contains('open')&&!reminder.contains(e.target)&&!document.getElementById('notifyBtn').contains(e.target)){reminder.classList.remove('open')}});

      var activity=document.getElementById('activityModal');
      var activityTitle=document.getElementById('activityTitle');
      var activityBody=document.getElementById('activityBody');
      function closeActivity(){activity.classList.remove('open');document.body.style.overflow='';var ac=activity.querySelector('.activity-card');if(ac)ac.classList.remove('wide')}
      document.getElementById('activityClose').addEventListener('click',closeActivity);
      activity.addEventListener('click',function(e){if(e.target===activity)closeActivity()});
      document.querySelectorAll('[data-activity]').forEach(function(btn){btn.addEventListener('click',function(){
        var type=btn.getAttribute('data-activity');
        if(type==='quiz'||type==='video'){
          lastFocus=btn;overlay.classList.add('open');document.body.style.overflow='hidden';
          document.getElementById('closeLesson').focus();
          if(type==='video')showToast('Clip bài học đã sẵn sàng');
          return;
        }
        activity.classList.add('open');document.body.style.overflow='hidden';
        if(type==='essay'){
          activityTitle.textContent='Tự luận tình huống';
          activityBody.innerHTML='<p>Khách hàng lo lắng vì thời gian sửa kéo dài hơn dự kiến. Bạn sẽ phản hồi thế nào để khách hàng an tâm?</p><textarea aria-label="Câu trả lời tự luận" placeholder="Viết câu trả lời của bạn..."></textarea><button class="primary" id="activityDone">Hoàn thành</button>';
        }else if(type==='survey'){
          activityTitle.textContent='Khảo sát sau bài học';
          activityBody.innerHTML='<p>Nội dung vừa học giúp bạn tự tin đến mức nào khi xử lý tình huống với khách hàng?</p><div class="survey-options"><button>Rất tự tin</button><button>Khá tự tin</button><button>Cần luyện thêm</button></div><button class="primary" id="activityDone">Gửi phản hồi</button>';
          activityBody.querySelectorAll('.survey-options button').forEach(function(o){o.addEventListener('click',function(){activityBody.querySelectorAll('.survey-options button').forEach(function(x){x.classList.remove('selected')});o.classList.add('selected')})});
        }else{
          activityTitle.textContent='Mini-game · Thử thách vui';
          function showGameMenu(){
            var card0=document.querySelector('.activity-card');if(card0)card0.classList.remove('wide');
            activityTitle.textContent='Mini-game · Thử thách vui';
            activityBody.innerHTML='<p>Chọn một thử thách để chơi và cộng XP:</p><div class="game-menu"><button class="game-pick" id="pickMem" type="button"><span class="game-pick-icon">🎴</span><span><strong>Lật thẻ 4C</strong><small>Game trí nhớ 8 thẻ · tối đa 100 XP</small></span></button><button class="game-pick" id="pickStage" type="button"><span class="game-pick-icon">🏪</span><span><strong>Vượt ải 4C</strong><small>Mô phỏng cửa hàng · 3 ải · tối đa 100 XP</small></span></button></div>';
            document.getElementById('pickMem').addEventListener('click',startMemGame);
            document.getElementById('pickStage').addEventListener('click',startStageGame);
          }
          function startMemGame(){
          activityTitle.textContent='Mini-game · Lật thẻ 4C';
          var PAIRS=[
            {icon:'⚡',label:'Chủ động',color:'#e84924',soft:'#ffe7df'},
            {icon:'😊',label:'Cười',color:'#0f766e',soft:'#dceee9'},
            {icon:'👋',label:'Chào',color:'#b97f10',soft:'#faecc9'},
            {icon:'🙏',label:'Cảm ơn',color:'#7c5cbf',soft:'#ece5f9'}
          ];
          activityBody.innerHTML='<button class="linklike" id="backMenu" type="button">‹ Chọn game khác</button><p class="mem-intro">Tìm 2 thẻ cùng cặp: chữ <b>C</b> đi với đúng ý nghĩa của nó. Lật càng ít lượt, XP càng cao!</p><div class="mem-stats"><span class="mem-stat">🔄 Lượt lật: <b id="memTurns">0</b></span><span class="mem-stat">🎯 Cặp đã tìm: <b><span id="memFound">0</span>/4</b></span></div><div class="mem-grid" id="memGrid" role="grid" aria-label="Bàn thẻ 4C"></div><div class="success-card" id="memWin" role="status"><img src="assets/fastie-celebrate.webp" alt="Sóc Fastie ăn mừng chiến thắng"><div><h3>Tuyệt vời!</h3><p id="memWinText"></p><button class="primary" id="memReplay" type="button">Chơi lại</button></div></div>';
          var memGrid=document.getElementById('memGrid'),memFirst=null,memLock=false,memTurns=0,memFound=0,memDone=false;
          function memBuild(){
            var deck=[];
            PAIRS.forEach(function(p,i){deck.push({pair:i,kind:'letter'});deck.push({pair:i,kind:'word'});});
            for(var k=deck.length-1;k>0;k--){var j=Math.floor(Math.random()*(k+1));var t=deck[k];deck[k]=deck[j];deck[j]=t;}
            memGrid.innerHTML='';
            deck.forEach(function(c){
              var p=PAIRS[c.pair];
              var el=document.createElement('button');
              el.type='button';el.className='mem-card';el.setAttribute('aria-label','Thẻ úp, bấm để lật');
              el.innerHTML='<span class="mem-inner"><span class="mem-face mem-front">?</span><span class="mem-face mem-back" style="--pc:'+p.color+';--ps:'+p.soft+'"><span class="mem-icon">'+p.icon+'</span>'+(c.kind==='letter'?'<span class="mem-letter">C</span>':'<span class="mem-word">'+p.label+'</span>')+'</span></span>';
              el._pair=c.pair;
              el.addEventListener('click',function(){memFlip(el);});
              memGrid.appendChild(el);
            });
            memFirst=null;memLock=false;memTurns=0;memFound=0;memDone=false;
            document.getElementById('memTurns').textContent='0';
            document.getElementById('memFound').textContent='0';
            document.getElementById('memWin').classList.remove('show');
          }
          function memFlip(el){
            if(memLock||memDone||el.classList.contains('flipped'))return;
            el.classList.add('flipped');
            el.setAttribute('aria-label','Thẻ đã lật');
            if(!memFirst){memFirst=el;return;}
            memTurns++;document.getElementById('memTurns').textContent=memTurns;
            if(memFirst._pair===el._pair){
              memFirst.classList.add('matched');el.classList.add('matched');
              memFirst=null;memFound++;document.getElementById('memFound').textContent=memFound;
              if(memFound===PAIRS.length)memWin();
            }else{
              memLock=true;
              var a=memFirst,b=el;memFirst=null;
              setTimeout(function(){a.classList.remove('flipped');a.setAttribute('aria-label','Thẻ úp, bấm để lật');b.classList.remove('flipped');b.setAttribute('aria-label','Thẻ úp, bấm để lật');memLock=false;},850);
            }
          }
          async function memWin(){
            memDone=true;
            var xp=Math.max(40,100-(memTurns-PAIRS.length)*10);
            document.getElementById('memWinText').textContent='Bạn tìm đủ 4 cặp chỉ sau '+memTurns+' lượt lật — nhận '+xp+' XP!';
            document.getElementById('memWin').classList.add('show');
            showToast('Hoàn thành Lật thẻ 4C! +'+xp+' XP');
            if(currentUser&&sb){
              try{
                var r=await sb.from('quiz_attempts').insert({user_id:currentUser.id,lesson_id:'mini-game-lat-the-4c',score:PAIRS.length,total:PAIRS.length,xp_earned:xp});
                if(r.error)throw r.error;
                refreshMyStats();renderRanking('individual');
              }catch(e){/* điểm đã hiển thị trên giao diện */}
            }
          }
          document.getElementById('memReplay').addEventListener('click',memBuild);
          document.getElementById('backMenu').addEventListener('click',showGameMenu);
          memBuild();
          }
          function startStageGame(){
            var STAGES=[
              {icon:'⚡',code:'C1',name:'Chủ động',color:'#e84924',soft:'#ffe7df',qs:[{q:'Một khách hàng vừa bước vào cửa hàng, nhưng bạn đang hỗ trợ một khách khác tại quầy. Bạn sẽ làm gì?',tip:'Chủ động ghi nhận khách mới, đồng thời không bỏ dở trách nhiệm với khách đang phục vụ.',opts:['Chào và hướng dẫn khách mới vào ghế chờ và báo sẽ hỗ trợ ngay, đồng thời tiếp tục phục vụ khách đang sửa máy','Tiếp tục làm việc, chờ khách mới tự lên tiếng','Bỏ khách đang phục vụ để chạy ngay sang khách mới','Hẹn khách mới hôm khác quay lại khi cửa hàng vắng hơn'],a:0,why:'Chủ động tiếp đón ngay từ giây đầu — đồng thời khéo léo hẹn khách mới chờ một chút thay vì bỏ dở khách đang phục vụ.'},{q:'Một chị khách đứng nhìn quanh cửa hàng, có vẻ đang tìm người giúp đỡ mà chưa mở lời. Bạn sẽ làm gì?',tip:'Quan sát và chủ động hỏi thăm trước khi khách phải lên tiếng.',opts:['Đứng quan sát thêm xem chị cần gì rồi tính','Chủ động đến hỏi: “Dạ chị cần em hỗ trợ gì ạ? - Mình đến sửa máy hay lấy máy ạ?”','Tiếp tục việc của mình, khách cần sẽ tự gọi','Chờ chị khách tự đến quầy rồi mới tiếp đón'],a:1,why:'Đừng đợi khách mở lời — chủ động hỏi thăm thể hiện sự quan tâm chân thành.'},{q:'Khách hỏi về một lỗi mà bạn chưa chắc chắn nguyên nhân. Bạn sẽ hành động thế nào?',tip:'Chủ động không có nghĩa là đoán mò — minh bạch và hẹn mốc cập nhật cụ thể.',opts:['Đoán nhanh một nguyên nhân để khách yên tâm trước','Chuyển ngay cho đồng nghiệp xử lý','Nhận máy và bảo khi nào xong sẽ gọi, không hẹn thời gian cụ thể','Trực tiếp hỏi thăm thêm và tình trạng máy, xin khách thêm thời gian kiểm tra kỹ máy trước khi đưa ra kết quả cuối'],a:3,why:'Đoán mò nghe có vẻ “chủ động” nhưng rất nguy hiểm — hỏi thêm tình trạng máy và xin thời gian kiểm tra kỹ trước khi kết luận mới là chuyên nghiệp.'},{q:'Trong lúc sửa máy, bạn phát hiện thêm một lỗi khác ngoài lỗi khách đã báo. Bạn sẽ làm gì?',tip:'Chủ động báo khách trước khi phát sinh thêm chi phí — minh bạch tạo niềm tin.',opts:['Tự sửa luôn lỗi đó rồi cộng tiền vào hóa đơn lúc giao máy','Bỏ qua lỗi đó, chỉ sửa đúng lỗi khách đã báo','Đợi đến lúc giao máy mới nói về lỗi phát sinh thêm','Liên hệ khách ngay, nói rõ lỗi phát sinh và chi phí, chỉ sửa tiếp khi khách đồng ý'],a:3,why:'Tự sửa rồi tính tiền sau khiến khách bị động và mất niềm tin — báo trước, được khách đồng ý rồi mới sửa thêm.'}]},
              {icon:'😊',code:'C2',name:'Cười',color:'#0f766e',soft:'#dceee9',qs:[{q:'Khách tỏ vẻ khó chịu vì chờ đợi quá lâu. Bạn sẽ làm gì?',tip:'Khách cần biết thiết bị của mình đang ở đâu — cập nhật chủ động với nụ cười.',opts:['Giải thích dài dòng vì sao hôm nay đông khách','Tươi cười và cập nhật tiến độ: “Máy mình đang ở bước kiểm tra cuối ạ!”','Im lặng, cố làm nhanh hơn mà không nói gì','Hẹn khách quay lại lấy máy vào hôm sau để khỏi phải chờ'],a:1,why:'Giải thích dài dòng nghe như biện minh — nụ cười thân thiện + cập nhật tiến độ cụ thể mới xoa dịu được.'},{q:'Khách nhăn mặt khi nghe báo giá sửa chữa. Bạn sẽ phản ứng thế nào?',tip:'Chuyên nghiệp không có nghĩa là nghiêm nghị — nụ cười nhẹ + minh bạch từng khoản.',opts:['Giữ vẻ mặt nghiêm túc cho chuyên nghiệp','Cười lớn, pha trò cho không khí nhẹ nhàng','Giảm giá ngay để khách đỡ khó chịu','Cười nhẹ và giải thích rõ từng khoản chi phí khi sửa'],a:3,why:'Nghiêm mặt dễ khiến khách thêm căng thẳng — nụ cười nhẹ kèm giải thích minh bạch từng khoản mới tạo niềm tin.'},{q:'Một khách lớn tuổi đến sửa máy, nghe không rõ và hỏi đi hỏi lại nhiều lần. Bạn sẽ làm gì?',tip:'Nụ cười và sự kiên nhẫn khiến khách lớn tuổi cảm thấy được tôn trọng.',opts:['Trả lời nhanh cho xong vì còn nhiều khách đang chờ','Nhờ khách khác đang chờ giải thích hộ cho nhanh','Mỉm cười, nói chậm và rõ, nhắc lại từng ý cho đến khi khách hiểu','Bảo khách để máy lại, hôm sau quay lại nghe kết quả'],a:2,why:'Vội vàng hay nhờ người khác giải thích đều khiến khách thấy mình làm phiền — cười, nói chậm và nhắc lại đến khi khách hiểu mới là chăm sóc thật sự.'}]},
              {icon:'👋',code:'C3',name:'Chào',color:'#b97f10',soft:'#faecc9',qs:[{q:'Khách đã nhận máy xong và chuẩn bị ra về. Bạn sẽ làm gì?',tip:'Chào khi đưa khách về — khép lại trải nghiệm một cách trọn vẹn.',opts:['Mở cửa và chào tạm biệt khách: “Dạ em chào anh/chị ạ!”','Cứ để khách tự ra về, tiếp tục công việc dang dở','Gật đầu nhẹ, không nói gì thêm','Tiễn khách ra cửa trong im lặng'],a:0,why:'Đừng để khách ra về trong im lặng — lời chào tạm biệt ấm áp là dấu chấm đẹp cho trải nghiệm.'},{q:'Khách tham khảo xong nhưng quyết định chưa sửa và ra về. Bạn sẽ làm gì?',tip:'Trân trọng cả khi khách chưa mua — hôm nay chưa sửa, mai họ sẽ nhớ thái độ của bạn.',opts:['Không nói gì, khách không mua thì thôi','Hỏi dồn: “Sao anh không sửa ạ?”','Cảm ơn và mời quay lại: “Khi nào cần anh ghé em nhé! Hoặc liên hệ với tổng đài bên em để được hỗ trợ nhanh nhất ạ”','Nhấn mạnh giá hôm nay đang ưu đãi để khách đổi ý'],a:2,why:'Thái độ trân trọng ngay cả khi khách chưa mua — đó là cách gieo niềm tin cho lần quay lại sau.'},{q:'Khách quay lại cửa hàng lấy máy sau thời gian gửi sửa. Bạn sẽ chào đón thế nào?',tip:'Chào đúng thời điểm + hỏi rõ nhu cầu — khách quay lại cũng cần được đón tiếp như khách mới.',opts:['Chào và hỏi thăm: “Dạ anh/chị đến lấy máy phải không ạ? Mình cho em xin phiếu sửa máy để em tìm máy giúp mình nhé!”','Hỏi thẳng mã phiếu rồi quay vào tìm, không chào hỏi gì thêm','Bảo khách tự đọc số thứ tự rồi ngồi chờ gọi tên','Để khách tự ra khu vực máy đã sửa xong để tự tìm máy của mình'],a:0,why:'Khách quay lại lấy máy vẫn cần một lời chào ấm áp và sự hướng dẫn rõ ràng — để khách tự loay hoay là thiếu tôn trọng.'}]}
            ];
            var si=0,qi=0,correct=0;
            var totalQ=STAGES.reduce(function(n,s){return n+s.qs.length;},0);
            function stageMapHTML(curIdx,fastieIdx){
              var nodes=STAGES.map(function(s,i){
                var st=i<curIdx?'done':(i===curIdx?'current':'locked');
                return '<div class="j-node '+st+'" style="--pc:'+s.color+';--ps:'+s.soft+'"><span class="j-node-icon">'+s.icon+'</span><span class="j-node-name">\u1ea2i '+(i+1)+'</span><span class="j-node-sub">'+s.name+'</span></div>';
              }).join('');
              nodes+='<div class="j-node goal '+(curIdx>=STAGES.length?'current':'locked')+'" style="--pc:#b97f10;--ps:#faecc9"><span class="j-node-icon">\ud83c\udfc5</span><span class="j-node-name">\u0110\u00edch</span><span class="j-node-sub">Huy hi\u1ec7u 4C</span></div>';
              var fi=fastieIdx==null?curIdx:fastieIdx;
              var left=(12.5+25*fi);
              return '<div class="journey"><div class="journey-path"></div><div class="j-nodes">'+nodes+'</div><div class="j-fastie" id="jFastie" style="left:calc('+left+'% - 27px)"><img src="assets/fastie-wave.webp" alt="S\u00f3c Fastie"></div></div>';
            }
            async function loadStageProgress(){
              var done=new Set();
              if(!currentUser||!sb)return done;
              try{
                var r=await sb.from('quiz_attempts').select('lesson_id,score,total').eq('user_id',currentUser.id);
                (r.data||[]).forEach(function(at){
                  var m=/^mini-game-vuot-ai-4c-ai-(\d)$/.exec(at.lesson_id||'');
                  if(m)done.add(+m[1]-1);
                  if(at.lesson_id==='mini-game-vuot-ai-4c')STAGES.forEach(function(_,i){done.add(i)});
                });
              }catch(e){}
              return done;
            }
            async function stageIntro(){
              var card=document.querySelector('.activity-card');if(card)card.classList.add('wide');
              activityTitle.textContent='Mini-game · V\u01b0\u1ee3t \u1ea3i 4C';
              var done=await loadStageProgress();
              var cur=0;while(cur<STAGES.length&&done.has(cur))cur++;
              var startLabel=cur>=STAGES.length?'Ch\u01a1i l\u1ea1i t\u1eeb \u0111\u1ea7u':(cur===0?'B\u1eaft \u0111\u1ea7u ca l\u00e0m vi\u1ec7c':'Ti\u1ebfp t\u1ee5c \u1ea3i '+(cur+1)+' \u00b7 '+STAGES[cur].name);
              activityBody.innerHTML='<button class="linklike" id="backMenu2" type="button">\u2039 Ch\u1ecdn game kh\u00e1c</button><p class="mem-intro">H\u00f3a th\u00e2n th\u00e0nh <b>Chi\u1ebfn binh FASTCARE</b>! V\u01b0\u1ee3t qua <b>3 c\u1eeda \u1ea3i</b> \u2014 10 t\u00ecnh hu\u1ed1ng th\u1ef1c t\u1ebf t\u1ea1i c\u1eeda h\u00e0ng \u2014 \u0111\u1ec3 nh\u1eadn <b>\ud83c\udfc5 Huy hi\u1ec7u Nh\u00e2n vi\u00ean 4C</b>. S\u00f3c Fastie s\u1ebd nh\u1ea3y theo t\u1eebng \u1ea3i b\u1ea1n v\u01b0\u1ee3t qua!</p>'+stageMapHTML(cur,cur)+'<button class="primary" id="stageStart" type="button">'+startLabel+'</button>';
              document.getElementById('backMenu2').addEventListener('click',showGameMenu);
              document.getElementById('stageStart').addEventListener('click',function(){si=cur>=STAGES.length?0:cur;showStageHead();});
            }
            function showStageHead(){
              var s=STAGES[si];
              activityTitle.textContent='Mini-game · Ải '+(si+1)+' '+s.name;
              activityBody.innerHTML='<div class="stage-banner" style="--pc:'+s.color+';--ps:'+s.soft+'"><span class="stage-big-icon">'+s.icon+'</span><div><h3>Ải '+(si+1)+' · '+s.name+'</h3><p>'+s.code+' — '+({ 'Chủ động':'Ghi nhận và tiếp đón khách đúng lúc','Cười':'Tạo thiện cảm khi khách phải chờ','Chào':'Chào khách đúng thời điểm','Cảm ơn':'Khép lại trải nghiệm bằng sự trân trọng' })[s.name]+'</p></div></div><p class="mem-intro">Ải này có <b>'+s.qs.length+' tình huống</b>. Chọn đáp án đúng nhất nhé!</p>'+stageMapHTML(si,si)+'<button class="primary" id="stageGo" type="button">Vào ải</button>';
              document.getElementById('stageGo').addEventListener('click',function(){qi=0;showSimQ();});
            }
            function showSimQ(){
              var s=STAGES[si],q=s.qs[qi];
              activityTitle.textContent='FASTCARE – Chiến binh FASTCARE';
              var letters=['A','B','C','D'];
              var qNum=0;STAGES.slice(0,si).forEach(function(s){qNum+=s.qs.length});qNum+=qi+1;
              var simImg=(typeof SIM_IMGS!=='undefined'&&SIM_IMGS[qNum-1])?SIM_IMGS[qNum-1]:'';
              var opts=q.opts.map(function(o,i){
                return '<button class="sim-act" data-i="'+i+'" type="button"><span class="sim-act-letter">'+letters[i]+'</span><span class="sim-act-text">'+o+'</span></button>';
              }).join('');
              activityBody.innerHTML=
              '<div class="sim-game" style="--pc:'+s.color+';--ps:'+s.soft+'">'+
                '<div class="sim-top-line"><span class="sim-stage-line">Ải '+(si+1)+'/'+STAGES.length+' · '+s.name+'</span><span class="sim-stage-badge">✅ <span id="simScore">'+correct+'</span>/'+totalQ+'</span></div>'+
                '<div class="sim-qa-row">'+
                  '<div class="sim-qcard">'+
                    '<div class="sim-q-head">'+(simImg?'<img class="sim-q-thumb" src="'+simImg+'" alt="Hình minh họa tình huống">':'')+'<span class="sim-q-pill">Câu hỏi '+qNum+'</span></div>'+
                    '<p class="sim-q-text">'+q.q+'</p>'+
                  '</div>'+
                  (simImg?'<figure class="sim-q-fig"><img src="'+simImg+'" alt="Hình minh họa tình huống câu hỏi '+qNum+'"><figcaption>Ải '+(si+1)+' · '+s.name+'</figcaption></figure>':'')+
                '</div>'+
                '<div class="sim-actions">'+opts+'</div>'+
                '<button class="primary sim-submit" id="simSubmit" type="button" disabled>HOÀN THÀNH NHIỆM VỤ →</button>'+
                '<div id="simFb"></div>'+
              '</div>';
              var picked=-1;
              var submitBtn=document.getElementById('simSubmit');
              activityBody.querySelectorAll('.sim-act').forEach(function(b){
                b.addEventListener('click',function(){
                  if(b.disabled)return;
                  activityBody.querySelectorAll('.sim-act').forEach(function(x){x.classList.remove('sel');});
                  b.classList.add('sel');
                  picked=+b.getAttribute('data-i');
                  submitBtn.disabled=false;
                });
              });
              submitBtn.addEventListener('click',function(){submitSim(q,picked);});
            }
            function submitSim(q,picked){
              if(picked<0){showToast('Hãy chọn một đáp án trước nhé!');return;}
              var ok=picked===q.a;
              activityBody.querySelectorAll('.sim-act').forEach(function(b){
                b.disabled=true;
                var i=+b.getAttribute('data-i');
                if(i===q.a)b.classList.add('good');
                else if(i===picked)b.classList.add('bad');
              });
              if(ok){correct++;var sc=document.getElementById('simScore');if(sc)sc.textContent=correct;}
              var moreQ=qi+1<STAGES[si].qs.length, moreS=si+1<STAGES.length;
              var submitBtn=document.getElementById('simSubmit');if(submitBtn)submitBtn.style.display='none';
              document.getElementById('simFb').innerHTML=
                '<div class="stage-result '+(ok?'ok':'bad')+'">'+(ok?'✅ Chính xác! +10 XP':'❌ Chưa đúng rồi')+'</div>'+
                '<p class="stage-why">💡 '+q.why+'</p>'+'<div class="sim-tip"><b>Mẹo văn hoá:</b> '+q.tip+'</div>'+
                '<button class="primary sim-submit" id="simNext" type="button">'+(moreQ?'Câu tiếp theo':(moreS?'Qua ải tiếp theo →':'Xem hành trình 🏅'))+'</button>';
              document.getElementById('simNext').addEventListener('click',function(){
                if(moreQ){qi++;showSimQ();}
                else{showStageDone();}
              });
            }
            function showStageDone(){
              var s=STAGES[si];
              var moreS=si+1<STAGES.length;
              if(currentUser&&sb){sb.from('quiz_attempts').insert({user_id:currentUser.id,lesson_id:'mini-game-vuot-ai-4c-ai-'+(si+1),score:s.qs.length,total:s.qs.length,xp_earned:0}).then(function(){},function(){});}
              activityTitle.textContent='Mini-game · Qua \u1ea3i!';
              activityBody.innerHTML='<div class="journey-done"><h3>'+(moreS?'V\u01b0\u1ee3t \u1ea3i '+(si+1)+' \u00b7 '+s.name+'!':'\ud83c\udf89 Ch\u00fac m\u1eebng b\u1ea1n \u0111\u00e3 ho\u00e0n th\u00e0nh!')+'</h3><p>'+s.icon+(moreS?' L\u00e0m t\u1ed1t l\u1eafm chi\u1ebfn binh! Fastie nh\u1ea3y l\u00ean \u1ea3i ti\u1ebfp theo nh\u00e9!':' B\u1ea1n \u0111\u00e3 v\u01b0\u1ee3t qua c\u1ea3 3 \u1ea3i nh\u01b0 m\u1ed9t chi\u1ebfn binh FASTCARE th\u1ef1c th\u1ee5! Fastie nh\u1ea3y v\u1ec1 \u0111\u00edch nh\u1eadn huy hi\u1ec7u nh\u00e9!')+'</p>'+stageMapHTML(si+1,si)+'<button class="primary sim-submit" id="stNextStage" type="button">'+(moreS?'V\u00e0o \u1ea3i ti\u1ebfp theo \u2192':'Nh\u1eadn huy hi\u1ec7u \ud83c\udfc5')+'</button></div>';
              var jf=document.getElementById('jFastie');
              setTimeout(function(){
                if(!jf||!document.body.contains(jf))return;
                var nl=(12.5+25*(si+1));
                jf.style.left='calc('+nl+'% - 27px)';jf.classList.add('hop');
                setTimeout(function(){jf.classList.remove('hop')},750);
              },160);
              document.getElementById('stNextStage').addEventListener('click',function(){if(moreS){si++;showStageHead();}else{showFinal();}});
            }
            async function showFinal(){
              var card=document.querySelector('.activity-card');if(card)card.classList.remove('wide');
              activityTitle.textContent='Mini-game · Huy hiệu 4C';
              var xp=correct*10;
              var msg=correct===totalQ?'Hoàn hảo! Bạn xử lý đúng cả '+totalQ+' tình huống như một chiến binh FASTCARE thực thụ!':'Bạn xử lý đúng '+correct+'/'+totalQ+' tình huống — luyện thêm để đạt điểm tuyệt đối nhé!';
              activityBody.innerHTML='<div class="badge-win"><div class="badge-medal">🏅</div><h3>Huy hiệu Nhân viên 4C</h3><p>'+msg+'</p><p class="badge-xp">+'+xp+' XP</p><div style="display:flex;gap:10px;justify-content:center;margin-top:8px;flex-wrap:wrap"><button class="primary" id="stReplay" type="button">Chơi lại</button><button class="secondary" id="stMenu" type="button">Chọn game khác</button></div></div>';
              showToast('Nhận Huy hiệu 4C! +'+xp+' XP');
              if(currentUser&&sb){
                try{
                  var r=await sb.from('quiz_attempts').insert({user_id:currentUser.id,lesson_id:'mini-game-vuot-ai-4c',score:correct,total:totalQ,xp_earned:xp});
                  if(r.error)throw r.error;
                  refreshMyStats();renderRanking('individual');
                }catch(e){}
              }
              document.getElementById('stReplay').addEventListener('click',function(){si=0;qi=0;correct=0;stageIntro();});
              document.getElementById('stMenu').addEventListener('click',showGameMenu);
            }
            stageIntro();
          }
          showGameMenu();
        }
        var done=document.getElementById('activityDone');if(done)done.addEventListener('click',function(){closeActivity();showToast('Đã hoàn thành hoạt động trong phiên demo')});
      })});
    })();
