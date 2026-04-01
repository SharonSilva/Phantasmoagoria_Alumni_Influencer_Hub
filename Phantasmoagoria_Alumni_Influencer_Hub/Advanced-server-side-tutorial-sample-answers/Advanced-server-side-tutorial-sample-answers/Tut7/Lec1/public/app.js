(function () {
  var content = document.getElementById('content');
  var messageEl = document.getElementById('message');

  function showMessage(msg) {
    messageEl.textContent = msg || '';
    messageEl.style.display = msg ? 'block' : 'none';
  }

  function api(path, options) {
    options = options || {};
    options.headers = options.headers || {};
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    return fetch(path, options).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function renderUsersList(data) {
    var users = data.users || [];
    var html = '<h1>Users</h1><ul>';
    users.forEach(function (u) {
      html += '<li><a href="#user/' + u.id + '">' + escapeHtml(u.name) + '</a></li>';
    });
    html += '</ul>';
    content.innerHTML = html;
  }

  function renderUserShow(data) {
    var u = data.user;
    var html = '<h1>' + escapeHtml(u.name) + ' <a href="#user/' + u.id + '/edit">edit</a></h1>';
    html += '<p>Pets: ';
    if (u.pets && u.pets.length) {
      u.pets.forEach(function (p) {
        html += '<a href="#pet/' + p.id + '">' + escapeHtml(p.name) + '</a> ';
      });
    } else {
      html += 'none';
    }
    html += '</p>';
    content.innerHTML = html;
  }

  function renderUserEdit(data) {
    var u = data.user;
    var html = '<h1>Edit user</h1>';
    html += '<form id="form" data-redirect="#user/' + u.id + '">';
    html += '<input name="user[name]" value="' + escapeHtml(u.name) + '">';
    html += '<button type="submit">Update</button></form>';
    content.innerHTML = html;
    document.getElementById('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = this.querySelector('input[name="user[name]"]');
      api('/user/' + u.id, {
        method: 'PUT',
        body: { user: { name: input.value } }
      }).then(function (r) {
        showMessage(r.message);
        if (r.redirect) location.hash = r.redirect.replace(/^\//, '#');
      }).catch(function (err) { showMessage(err.message); });
    });
  }

  function renderPetsList(data) {
    var pets = data.pets || [];
    var html = '<h1>Pets</h1><ul>';
    pets.forEach(function (p) {
      html += '<li><a href="#pet/' + p.id + '">' + escapeHtml(p.name) + '</a></li>';
    });
    html += '</ul>';
    content.innerHTML = html;
  }

  function renderPetShow(data) {
    var p = data.pet;
    var html = '<h1>' + escapeHtml(p.name) + ' <a href="#pet/' + p.id + '/edit">edit</a></h1>';
    html += '<p>You are viewing ' + escapeHtml(p.name) + '</p>';
    content.innerHTML = html;
  }

  function renderPetEdit(data) {
    var p = data.pet;
    var html = '<h1>Edit pet</h1>';
    html += '<form id="form" data-redirect="#pet/' + p.id + '">';
    html += '<input name="pet[name]" value="' + escapeHtml(p.name) + '">';
    html += '<button type="submit">Update</button></form>';
    content.innerHTML = html;
    document.getElementById('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = this.querySelector('input[name="pet[name]"]');
      api('/pet/' + p.id, {
        method: 'PUT',
        body: { pet: { name: input.value } }
      }).then(function (r) {
        showMessage(r.message);
        if (r.redirect) location.hash = r.redirect.replace(/^\//, '#');
      }).catch(function (err) { showMessage(err.message); });
    });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function route() {
    var hash = (location.hash || '#users').slice(1);
    var parts = hash.split('/');
    showMessage('');

    if (parts[0] === 'users') {
      api('/users').then(renderUsersList).catch(function (err) { content.innerHTML = '<p>' + escapeHtml(err.message) + '</p>'; });
      return;
    }
    if (parts[0] === 'user' && parts[1] !== undefined) {
      var userId = parts[1];
      if (parts[2] === 'edit') {
        api('/user/' + userId).then(renderUserEdit).catch(function (err) { content.innerHTML = '<p>' + escapeHtml(err.message) + '</p>'; });
      } else {
        api('/user/' + userId).then(renderUserShow).catch(function (err) { content.innerHTML = '<p>' + escapeHtml(err.message) + '</p>'; });
      }
      return;
    }
    if (parts[0] === 'pets') {
      api('/pets').then(renderPetsList).catch(function (err) { content.innerHTML = '<p>' + escapeHtml(err.message) + '</p>'; });
      return;
    }
    if (parts[0] === 'pet' && parts[1] !== undefined) {
      var petId = parts[1];
      if (parts[2] === 'edit') {
        api('/pet/' + petId).then(renderPetEdit).catch(function (err) { content.innerHTML = '<p>' + escapeHtml(err.message) + '</p>'; });
      } else {
        api('/pet/' + petId).then(renderPetShow).catch(function (err) { content.innerHTML = '<p>' + escapeHtml(err.message) + '</p>'; });
      }
      return;
    }
    api('/users').then(renderUsersList).catch(function (err) { content.innerHTML = '<p>' + escapeHtml(err.message) + '</p>'; });
  }

  window.addEventListener('hashchange', route);
  route();
})();
