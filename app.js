(function(){
      /* ===== Supabase: đăng nhập thật + dữ liệu chung ===== */
      var SUPABASE_URL='https://lmcqcdpzgbdxntwodjed.supabase.co';
      var SUPABASE_KEY='sb_publishable_Hvwz9IQza278-z6j1NAxnQ_Qo1yEkuD';
      var LESSON_ID='bai-3-4-van-hoa-phuc-vu';
      var LESSON_XP=120;
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
      function lockApp(){document.body.classList.add('locked');currentUser=null;userRole='staff';var an=document.getElementById('adminNav');if(an)an.style.display='none';var acn=document.getElementById('accountsNav');if(acn)acn.style.display='none'}
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
        var acn=document.getElementById('accountsNav');if(acn)acn.style.display=(profile&&profile.role==='admin')?'':'none';
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
          var qa=await sb.from('quiz_attempts').select('score,total,xp_earned,created_at').eq('user_id',currentUser.id);
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
              return '<div class="rank-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(null,it.full_name)+'</div><div><strong>'+escapeHtml(it.full_name||'Học viên')+'</strong><span>'+escapeHtml(it.email||'')+(it.department?' · '+escapeHtml(it.department):'')+'</span></div></div><span class="dept">'+d+'</span><span class="xp"><button class="approve-btn" data-approve="'+it.id+'">Duyệt</button> <button class="reject-btn" data-reject="'+it.id+'">Từ chối</button></span></div>';
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
              return '<div class="rank-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(null,it.full_name)+'</div><div><strong>'+escapeHtml(it.full_name||'Học viên')+'</strong><span>'+escapeHtml(it.email||'')+(it.department?' · '+escapeHtml(it.department):'')+'</span></div></div><span class="dept">'+d+'</span><span class="xp"><button class="approve-btn" data-approve2="'+it.id+'">Duyệt</button> <button class="restore-btn" data-restore="'+it.id+'">Hoàn tác</button></span></div>';
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
          }
          renderPermRows();
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
        box.innerHTML='<div class="rank-row rank-head"><span>•</span><span>Tài khoản ('+rows.length+')</span><span class="dept">Trạng thái</span><span class="xp">Quyền</span></div>'+rows.map(function(p){
          var self=p.id===currentUser.id;
          var opts=[['staff','Nhân viên'],['manager','Quản lý'],['admin','Quản trị viên']].map(function(o){
            return '<option value="'+o[0]+'"'+(p.role===o[0]?' selected':'')+'>'+o[1]+'</option>';
          }).join('');
          return '<div class="rank-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(null,p.full_name)+'</div><div><strong>'+escapeHtml(p.full_name||'Học viên')+(self?' (bạn)':'')+'</strong><span>'+escapeHtml(p.email||'')+(p.department?' · '+escapeHtml(p.department):'')+'</span></div></div><span class="dept">'+permStatus(p)+'</span><span class="xp"><select class="role-select" data-role-for="'+p.id+'"'+(self?' disabled title="Không thể đổi quyền của chính bạn"':'')+'>'+opts+'</select></span></div>';
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
      var dirRows=[],dirWired=false,dirRegEmails={};
      async function renderDirectory(){
        var box=document.getElementById('dirTable');
        if(!box||userRole!=='admin')return;
        try{
          var res=await sb.rpc('get_staff_directory');
          if(res.error)throw res.error;
          dirRows=res.data||[];
          var pr=await sb.from('profiles').select('email');
          if(!pr.error){dirRegEmails={};(pr.data||[]).forEach(function(x){if(x.email)dirRegEmails[x.email.toLowerCase()]=true})}
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
          }
          renderDirRows();
        }catch(e){box.innerHTML='<p class="muted-center">Chưa tải được danh bạ. Nếu đây là lần đầu dùng mục này, hãy chạy bản cập nhật database mới nhất (file SQL Luke gửi) rồi tải lại trang.</p>'}
      }
      function renderDirRows(){
        var box=document.getElementById('dirTable');
        if(!box)return;
        var q=(document.getElementById('dirSearch').value||'').toLowerCase();
        var u=document.getElementById('dirUnit').value;
        var rows=dirRows.filter(function(p){
          if(u&&p.department!==u)return false;
          if(q&&(p.full_name||'').toLowerCase().indexOf(q)<0&&(p.email||'').toLowerCase().indexOf(q)<0&&(p.employee_code||'').toLowerCase().indexOf(q)<0)return false;
          return true;
        });
        var reg=0;dirRows.forEach(function(p){if(dirRegEmails[(p.email||'').toLowerCase()])reg++});
        document.getElementById('dirSummary').textContent='Tổng '+dirRows.length+' người trong danh bạ · '+reg+' đã có tài khoản · '+(dirRows.length-reg)+' chưa đăng ký';
        if(!rows.length){box.innerHTML='<p class="muted-center">Không có ai khớp.</p>';return}
        box.innerHTML='<div class="rank-row rank-head"><span>•</span><span>Nhân sự ('+rows.length+')</span><span class="dept">Đơn vị</span><span class="xp">Trạng thái</span></div>'+rows.map(function(p){
          var has=!!dirRegEmails[(p.email||'').toLowerCase()];
          var sdp=p.start_date?String(p.start_date).slice(0,10).split('-'):null;
          var meta=(p.employee_code?p.employee_code+' · ':'')+(p.position||'')+(sdp?' · Vào '+sdp[2]+'/'+sdp[1]+'/'+sdp[0]:'');
          return '<div class="rank-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(null,p.full_name)+'</div><div><strong>'+escapeHtml(p.full_name||'Nhân sự')+'</strong><span>'+escapeHtml(p.email||'')+(meta?' · '+escapeHtml(meta):'')+'</span></div></div><span class="dept">'+escapeHtml(p.department||'—')+'</span><span class="xp">'+(has?'<span class="status-chip st-ok">Đã có tài khoản</span>':'<span class="status-chip st-pending">Chưa đăng ký</span>')+'</span></div>';
        }).join('');
      }
      var lastUid=null;
      var accRows=[],accWired=false;
      async function renderAccounts(){
        var box=document.getElementById('accountsTable');
        if(!box||userRole!=='admin')return;
        try{
          var res=await sb.from('profiles').select('id,full_name,email,department,employee_code,role,is_approved,is_rejected,created_at').order('full_name',{ascending:true});
          if(res.error){res=await sb.from('profiles').select('id,full_name,email,department,employee_code,role,is_approved,created_at').order('full_name',{ascending:true})}
          if(res.error)throw res.error;
          accRows=res.data||[];
          if(!accWired){
            accWired=true;
            document.getElementById('accSearch').addEventListener('input',renderAccRows);
          }
          renderAccRows();
        }catch(e){box.innerHTML='<p class="muted-center">Chưa tải được danh sách tài khoản.</p>'}
      }
      function accRoleLabel(r){return r==='admin'?'Quản trị viên':(r==='manager'?'Quản lý':'Nhân viên')}
      function renderAccRows(){
        var box=document.getElementById('accountsTable');
        if(!box)return;
        var q=(document.getElementById('accSearch').value||'').toLowerCase();
        var rows=accRows.filter(function(p){
          if(q&&(p.full_name||'').toLowerCase().indexOf(q)<0&&(p.email||'').toLowerCase().indexOf(q)<0&&(p.employee_code||'').toLowerCase().indexOf(q)<0)return false;
          return true;
        });
        var sum=document.getElementById('accSummary');
        if(sum)sum.textContent='Tổng '+accRows.length+' tài khoản đã đăng ký';
        if(!rows.length){box.innerHTML='<p class="muted-center">Không có tài khoản nào khớp.</p>';return}
        box.innerHTML='<div class="rank-row rank-head"><span>•</span><span>Tài khoản ('+rows.length+')</span><span class="dept">Trạng thái · Quyền</span><span class="xp">Thao tác</span></div>'+rows.map(function(p){
          var self=p.id===currentUser.id;
          var meta=(p.employee_code?p.employee_code+' · ':'')+accRoleLabel(p.role);
          var act=self?'<span style="font-size:12px;color:var(--muted)">Bạn</span>':'<button class="del-btn" data-del="'+p.id+'">Xoá tài khoản</button>';
          return '<div class="rank-row"><b>•</b><div class="person"><div class="person-dot">'+dotAvatar(p.avatar_url,p.full_name)+'</div><div><strong>'+escapeHtml(p.full_name||'Học viên')+(self?' (bạn)':'')+'</strong><span>'+escapeHtml(p.email||'')+' · '+escapeHtml(meta)+'</span></div></div><span class="dept">'+permStatus(p)+'</span><span class="xp">'+act+'</span></div>';
        }).join('');
        box.querySelectorAll('[data-del]').forEach(function(b){
          b.addEventListener('click',function(){
            var p=null;accRows.forEach(function(x){if(x.id===b.getAttribute('data-del'))p=x});
            if(p)deleteAccount(p,b);
          });
        });
      }
      async function deleteAccount(p,btn){
        var label=(p.full_name||'tài khoản này')+' ('+(p.email||'')+')';
        if(!confirm('Xoá tài khoản '+label+'?\n\nToàn bộ tiến trình học, điểm XP và lượt làm bài của người này sẽ bị xoá vĩnh viễn. Người này muốn dùng lại phải ĐĂNG KÝ LẠI từ đầu bằng email.'))return;
        if(!confirm('Xác nhận lần cuối: xoá hẳn tài khoản '+label+'?'))return;
        if(btn)btn.disabled=true;
        try{
          var r=await sb.rpc('admin_delete_user',{target_id:p.id});
          if(r.error)throw r.error;
          showToast('Đã xoá tài khoản '+label);
          renderAccounts();renderAdmin();
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
        document.getElementById('loginForm').addEventListener('submit',async function(e){
          e.preventDefault();setAuthError('');
          var btn=document.getElementById('loginBtn');btn.disabled=true;btn.textContent='Đang đăng nhập…';
          try{
            var r=await sb.auth.signInWithPassword({email:document.getElementById('loginEmail').value.trim(),password:document.getElementById('loginPassword').value});
            if(r.error)throw r.error;
          }catch(err){setAuthError(authMsg(err))}
          btn.disabled=false;btn.textContent='Đăng nhập';
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
      navButtons.forEach(function(btn){btn.addEventListener('click',function(){var v=btn.getAttribute('data-view');switchView(v);if(v==='admin'&&canModerate()){renderPendingApprovals();if(userRole==='admin'){renderPermissions();renderDirectory()}}if(v==='accounts'&&userRole==='admin')renderAccounts()})});
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
            activityBody.innerHTML='<p>Chọn một thử thách để chơi và cộng XP:</p><div class="game-menu"><button class="game-pick" id="pickMem" type="button"><span class="game-pick-icon">🎴</span><span><strong>Lật thẻ 4C</strong><small>Game trí nhớ 8 thẻ · tối đa 100 XP</small></span></button><button class="game-pick" id="pickStage" type="button"><span class="game-pick-icon">🏪</span><span><strong>Vượt ải 4C</strong><small>Mô phỏng cửa hàng · 4 ải · tối đa 120 XP</small></span></button></div>';
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
              {icon:'⚡',code:'C1',name:'Chủ động',color:'#e84924',soft:'#ffe7df',qs:[
                {scene:'Khách vừa đến!',cust:'🧑',line:'Xin chào, mình cần hỗ trợ ạ!',mission:'Đón khách đúng lúc',
                 s:'Một vị khách vừa bước vào cửa hàng. Bạn đang hỗ trợ khách khác tại quầy.',
                 tip:'Chủ động ghi nhận khách mới, đồng thời không bỏ dở trách nhiệm với khách đang phục vụ.',
                 opts:[
                   {icon:'🙋',t:'Chủ động ghi nhận khách',d:'Chào khách và báo sẽ hỗ trợ ngay'},
                   {icon:'📱',t:'Chờ khách tự lên tiếng',d:'Tiếp tục làm việc, không phản hồi'},
                   {icon:'🏃',t:'Bỏ khách đang phục vụ',d:'Chạy ngay sang khách mới'}
                 ],a:0,
                 why:'Chủ động tiếp đón ngay từ giây đầu — đồng thời khéo léo hẹn khách mới chờ một chút thay vì bỏ dở khách đang phục vụ.'},
                {scene:'Khách đang ngó nghiêng!',cust:'👩',line:'Hmm, không biết hỏi ai đây…',mission:'Đừng để khách phải mở lời',
                 s:'Một chị khách đứng nhìn quanh cửa hàng, có vẻ đang tìm kiếm sự giúp đỡ.',
                 tip:'Quan sát và chủ động hỏi thăm trước khi khách phải lên tiếng.',
                 opts:[
                   {icon:'👀',t:'Đứng quan sát thêm',d:'Xem khách cần gì rồi tính'},
                   {icon:'💬',t:'Chủ động hỏi thăm',d:'“Dạ chị cần em hỗ trợ gì ạ?”'},
                   {icon:'💼',t:'Tiếp tục việc của mình',d:'Khách cần sẽ tự gọi'}
                 ],a:1,
                 why:'Đừng đợi khách mở lời — chủ động hỏi thăm thể hiện sự quan tâm chân thành.'},
                {scene:'Câu hỏi khó!',cust:'🧔',line:'Lỗi này do đâu vậy em?',mission:'Trung thực khi chưa chắc chắn',
                 s:'Khách hỏi về một lỗi mà bạn chưa chắc chắn nguyên nhân.',
                 tip:'Chủ động không có nghĩa là đoán mò — minh bạch và hẹn mốc cập nhật cụ thể.',
                 opts:[
                   {icon:'🎲',t:'Đoán nhanh nguyên nhân',d:'Để khách yên tâm trước đã'},
                   {icon:'📋',t:'Hẹn mốc cập nhật cụ thể',d:'“Để em kiểm tra kỹ, 10h em báo anh nhé!”'},
                   {icon:'🔀',t:'Chuyển cho người khác',d:'Nhờ đồng nghiệp xử lý ngay'}
                 ],a:1,
                 why:'Đoán mò nghe có vẻ “chủ động” nhưng rất nguy hiểm — minh bạch và hẹn mốc cập nhật cụ thể mới là chuyên nghiệp.'}
              ]},
              {icon:'😊',code:'C2',name:'Cười',color:'#0f766e',soft:'#dceee9',qs:[
                {scene:'Khách phải chờ!',cust:'👵',line:'Chờ lâu quá…',mission:'Nụ cười xoa dịu thời gian chờ',
                 s:'Cửa hàng đang đông, một bác khách phải chờ 15 phút. Bạn mang nước ra mời.',
                 tip:'Nụ cười + giao tiếp bằng mắt biến thời gian chờ thành trải nghiệm dễ chịu.',
                 opts:[
                   {icon:'😊',t:'Cười tươi mời nước',d:'“Dạ con mời bác dùng nước ạ!”'},
                   {icon:'🥤',t:'Đặt nước rồi đi',d:'Không nói gì thêm'},
                   {icon:'⏳',t:'Nhắn khách thông cảm',d:'Rồi quay lại quầy ngay'}
                 ],a:0,
                 why:'Ly nước kèm nụ cười và ánh mắt chân thành — khách sẽ thấy 15 phút chờ đợi nhẹ nhàng hơn nhiều.'},
                {scene:'Khách khó chịu!',cust:'😠',line:'Sao lâu thế?!',mission:'Giữ bình tĩnh, chủ động cập nhật',
                 s:'Khách tỏ vẻ khó chịu vì chờ đợi quá lâu.',
                 tip:'Khách cần biết thiết bị của mình đang ở đâu — cập nhật chủ động với nụ cười.',
                 opts:[
                   {icon:'🗣️',t:'Giải thích dài dòng',d:'Kể vì sao hôm nay đông khách'},
                   {icon:'🤫',t:'Im lặng làm nhanh hơn',d:'Không nói gì, cố tăng tốc'},
                   {icon:'😊',t:'Cười và cập nhật tiến độ',d:'“Máy mình đang ở bước kiểm tra cuối ạ!”'}
                 ],a:2,
                 why:'Giải thích dài dòng nghe như biện minh — nụ cười thân thiện + cập nhật tiến độ cụ thể mới xoa dịu được.'},
                {scene:'Báo giá căng thẳng!',cust:'🧐',line:'Sao mắc vậy?',mission:'Nụ cười + minh bạch chi phí',
                 s:'Khách nhăn mặt khi nghe báo giá sửa chữa.',
                 tip:'Chuyên nghiệp không có nghĩa là nghiêm nghị — nụ cười nhẹ + minh bạch từng khoản.',
                 opts:[
                   {icon:'😊',t:'Cười nhẹ, giải thích rõ',d:'Phân tích từng khoản chi phí'},
                   {icon:'😐',t:'Nghiêm mặt cho chuyên nghiệp',d:'Giữ vẻ mặt nghiêm túc'},
                   {icon:'😂',t:'Cười lớn cho vui',d:'Pha trò để không khí nhẹ nhàng'}
                 ],a:0,
                 why:'Nghiêm mặt dễ khiến khách thêm căng thẳng — nụ cười nhẹ kèm giải thích minh bạch từng khoản mới tạo niềm tin.'}
              ]},
              {icon:'👋',code:'C3',name:'Chào',color:'#b97f10',soft:'#faecc9',qs:[
                {scene:'Khách ra về!',cust:'👋',line:'Cảm ơn nhé!',mission:'Chào khi tiễn khách',
                 s:'Khách đã nhận máy xong và chuẩn bị ra về.',
                 tip:'Chào khi đưa khách về — khép lại trải nghiệm một cách trọn vẹn.',
                 opts:[
                   {icon:'💼',t:'Quay lại quầy việc',d:'Tiếp tục công việc dang dở'},
                   {icon:'🙂',t:'Gật đầu nhẹ',d:'Không nói gì thêm'},
                   {icon:'👋',t:'Vẫy tay chào tạm biệt',d:'“Dạ em chào anh/chị ạ!”'}
                 ],a:2,
                 why:'Đừng để khách ra về trong im lặng — lời chào tạm biệt ấm áp là dấu chấm đẹp cho trải nghiệm.'},
                {scene:'Hai khách cùng lúc!',cust:'🧑‍💼',line:'(vừa bước vào cửa hàng)',mission:'Chào bằng ánh mắt',
                 s:'Bạn đang tư vấn cho khách A thì bắt gặp ánh mắt khách B vừa bước vào.',
                 tip:'Chào bằng ánh mắt khi bắt gặp ánh mắt khách — ghi nhận mà không làm gián đoạn.',
                 opts:[
                   {icon:'😊',t:'Cười, gật đầu chào',d:'Rồi tiếp tục với khách A'},
                   {icon:'🙈',t:'Làm ngơ',d:'Tư vấn xong khách A đã'},
                   {icon:'🏃',t:'Chạy ra chào ngay',d:'Bỏ dở khách A'}
                 ],a:0,
                 why:'Làm ngơ khiến khách B thấy bị bỏ rơi, bỏ dở khách A thì thiếu tôn trọng — chào bằng ánh mắt là cách vẹn cả đôi đường.'},
                {scene:'Khách quen trở lại!',cust:'😎',line:'Lại gặp nhau rồi!',mission:'Chào có ghi nhận',
                 s:'Anh khách quen quay lại cửa hàng lần thứ 3 trong tháng.',
                 tip:'Chào đúng thời điểm + ghi nhận khách quen — sự quan tâm chân thành.',
                 opts:[
                   {icon:'📋',t:'Chào đúng quy trình',d:'Như với khách mới'},
                   {icon:'🤝',t:'Chào thân mật',d:'“Máy mình dùng ổn không anh?”'},
                   {icon:'👋',t:'Không cần chào',d:'Đã quen mặt nhau rồi'}
                 ],a:1,
                 why:'Khách quen được ghi nhận sẽ thấy mình đặc biệt — một câu hỏi thăm chân thành hơn vạn lời chào xã giao.'}
              ]},
              {icon:'🙏',code:'C4',name:'Cảm ơn',color:'#7c5cbf',soft:'#ece5f9',qs:[
                {scene:'Thanh toán xong!',cust:'💳',line:'Anh gửi tiền nhé!',mission:'Cảm ơn sau giao dịch',
                 s:'Khách vừa thanh toán xong chi phí sửa chữa.',
                 tip:'Luôn cảm ơn và cười với khách hàng — câu nói nhỏ, ấn tượng lớn.',
                 opts:[
                   {icon:'🧾',t:'Đưa hóa đơn',d:'“Xong rồi ạ!”'},
                   {icon:'🤫',t:'Im lặng đưa hóa đơn',d:'Không nói gì thêm'},
                   {icon:'🙏',t:'Cảm ơn kèm nụ cười',d:'“Dạ em cảm ơn anh/chị ạ!”'}
                 ],a:2,
                 why:'Đừng để giao dịch kết thúc khô khan — lời cảm ơn kèm nụ cười khiến khách nhớ mãi.'},
                {scene:'Khách góp ý!',cust:'😐',line:'Lần trước chờ hơi lâu đó.',mission:'Cảm ơn cả lời chê',
                 s:'Khách góp ý về trải nghiệm chưa tốt lần trước.',
                 tip:'Cảm ơn khách khi nhận được góp ý — biến phàn nàn thành cơ hội.',
                 opts:[
                   {icon:'🗣️',t:'Giải thích lý do',d:'Hôm đó đông khách mà'},
                   {icon:'🙏',t:'Cảm ơn và ghi nhận',d:'“Bên em sẽ cải thiện ạ!”'},
                   {icon:'🤐',t:'Im lặng cho qua',d:'Không phản hồi'}
                 ],a:1,
                 why:'Biện minh khiến khách thêm bực — cảm ơn góp ý và cam kết cải thiện mới giữ được lòng tin.'},
                {scene:'Khách chưa mua!',cust:'🚶',line:'Để anh về suy nghĩ đã.',mission:'Trân trọng đến phút cuối',
                 s:'Khách tham khảo xong nhưng quyết định chưa sửa và ra về.',
                 tip:'Trân trọng cả khi khách chưa mua — hôm nay chưa sửa, mai họ sẽ nhớ thái độ của bạn.',
                 opts:[
                   {icon:'🙏',t:'Cảm ơn và mời quay lại',d:'“Khi nào cần anh ghé em nhé!”'},
                   {icon:'😶',t:'Không nói gì',d:'Khách không mua thì thôi'},
                   {icon:'❓',t:'Hỏi dồn lý do',d:'“Sao anh không sửa ạ?”'}
                 ],a:0,
                 why:'Thái độ trân trọng ngay cả khi khách chưa mua — đó là cách gieo niềm tin cho lần quay lại sau.'}
              ]}
            ];
            var si=0,qi=0,correct=0;
            var totalQ=STAGES.reduce(function(n,s){return n+s.qs.length;},0);
            function stageIntro(){
              var card=document.querySelector('.activity-card');if(card)card.classList.add('wide');
              activityTitle.textContent='Mini-game · Vượt ải 4C';
              var map=STAGES.map(function(s){
                return '<div class="stage-chip" style="--pc:'+s.color+';--ps:'+s.soft+'"><span>'+s.icon+'</span><b>Ải · '+s.name+'</b></div>';
              }).join('');
              activityBody.innerHTML='<button class="linklike" id="backMenu2" type="button">‹ Chọn game khác</button><p class="mem-intro">Hóa thân thành <b>Chiến binh FASTCARE</b>! Vượt qua <b>4 cửa ải</b> — mỗi ải 3 tình huống thực tế tại cửa hàng — để nhận <b>🏅 Huy hiệu Nhân viên 4C</b>.</p><div class="stage-map">'+map+'</div><button class="primary" id="stageStart" type="button">Bắt đầu ca làm việc</button>';
              document.getElementById('backMenu2').addEventListener('click',showGameMenu);
              document.getElementById('stageStart').addEventListener('click',function(){si=0;showStageHead();});
            }
            function showStageHead(){
              var s=STAGES[si];
              activityTitle.textContent='Mini-game · Ải '+(si+1)+' '+s.name;
              activityBody.innerHTML='<div class="stage-banner" style="--pc:'+s.color+';--ps:'+s.soft+'"><span class="stage-big-icon">'+s.icon+'</span><div><h3>Ải '+(si+1)+' · '+s.name+'</h3><p>'+s.code+' — '+({ 'Chủ động':'Ghi nhận và tiếp đón khách đúng lúc','Cười':'Tạo thiện cảm khi khách phải chờ','Chào':'Chào khách đúng thời điểm','Cảm ơn':'Khép lại trải nghiệm bằng sự trân trọng' })[s.name]+'</p></div></div><p class="mem-intro">Ải này có <b>'+s.qs.length+' tình huống</b>. Chọn hành động đúng nhất nhé!</p><button class="primary" id="stageGo" type="button">Vào ải</button>';
              document.getElementById('stageGo').addEventListener('click',function(){qi=0;showSimQ();});
            }
            function showSimQ(){
              var s=STAGES[si],q=s.qs[qi];
              activityTitle.textContent='FASTCARE – Chiến binh FASTCARE';
              var opts=q.opts.map(function(o,i){
                return '<button class="sim-act" data-i="'+i+'" type="button"><span class="sim-act-icon">'+o.icon+'</span><span><strong>'+o.t+'</strong><small>'+o.d+'</small></span></button>';
              }).join('');
              activityBody.innerHTML=
              '<div class="sim-game" style="--pc:'+s.color+';--ps:'+s.soft+'">'+
                '<div class="sim-main">'+
                  '<div class="sim-scene-panel">'+
                    '<div class="sim-scene-top"><span class="sim-store">CỬA HÀNG FASTCARE</span><span class="sim-stage-badge">CỬA ẢI '+(si+1)+'/4 · ✅ <span id="simScore">'+correct+'</span>/'+totalQ+'</span></div>'+
                    '<h3 class="sim-scene-title">'+q.scene+'</h3>'+
                    '<div class="sim-scene">'+
                      '<div class="sim-awning"><span>FASTCARE</span></div>'+
                      '<div class="sim-chars">'+
                        '<div class="sim-char"><div class="sim-avatar staff"><img src="assets/fastie-wave.webp" alt="Sóc Fastie - Chiến binh FASTCARE"></div><span class="sim-name">CHIẾN BINH FASTCARE</span></div>'+
                        '<div class="sim-bubble">'+q.line+'</div>'+
                        '<div class="sim-char"><div class="sim-avatar cust"><span>'+q.cust+'</span></div><span class="sim-name">KHÁCH HÀNG</span></div>'+
                      '</div>'+
                    '</div>'+
                    '<div class="sim-act-label">✨ Chọn hành động để giúp khách hàng</div>'+
                    '<div class="sim-actions">'+opts+'</div>'+
                  '</div>'+
                  '<div class="sim-mission-panel">'+
                    '<div class="sim-eyebrow" style="color:'+s.color+'">'+s.code+' · '+s.name.toUpperCase()+'</div>'+
                    '<h3>'+q.mission+'</h3>'+
                    '<p class="sim-desc">'+q.s+'</p>'+
                    '<div class="sim-tip"><b>💡 Mẹo văn hoá:</b> '+q.tip+'</div>'+
                    '<p class="sim-hint">Chọn hành động phù hợp để hoàn thành nhiệm vụ nhé!</p>'+
                    '<button class="primary sim-submit" id="simSubmit" type="button" disabled>HOÀN THÀNH NHIỆM VỤ →</button>'+
                    '<div id="simFb"></div>'+
                  '</div>'+
                '</div>'+
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
              if(picked<0){showToast('Hãy chọn một hành động trước nhé!');return;}
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
                '<p class="stage-why">💡 '+q.why+'</p>'+
                '<button class="primary sim-submit" id="simNext" type="button">'+(moreQ?'Tình huống tiếp theo':(moreS?'Qua ải tiếp theo →':'Nhận huy hiệu 🏅'))+'</button>';
              document.getElementById('simNext').addEventListener('click',function(){
                if(moreQ){qi++;showSimQ();}
                else if(moreS){showStageDone();}
                else{showFinal();}
              });
            }
            function showStageDone(){
              var s=STAGES[si];
              activityTitle.textContent='Mini-game · Qua ải!';
              activityBody.innerHTML='<div class="success-card show"><img src="assets/fastie-celebrate.webp" alt="Sóc Fastie ăn mừng"><div><h3>Vượt ải '+(si+1)+' · '+s.name+'!</h3><p>'+s.icon+' Làm tốt lắm chiến binh! Còn '+(STAGES.length-si-1)+' ải nữa thôi.</p><button class="primary" id="stNextStage" type="button">Vào ải tiếp theo →</button></div></div>';
              document.getElementById('stNextStage').addEventListener('click',function(){si++;showStageHead();});
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
