<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CI3 To-Do List</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Bootstrap 5 CDN -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<div class="container py-5">

  <div class="row justify-content-center">
    <div class="col-lg-8">

      <div class="card shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h1 class="h4 mb-1">To-Do List</h1>
              <p class="text-muted mb-0">No account needed. Your browser session stores your user id.</p>
            </div>

            <div class="text-end">
              <div class="small text-muted">Session user id</div>
              <code class="small"><?php echo htmlspecialchars($user_id); ?></code>
            </div>
          </div>

          <hr>

          <?php if (!empty($success)) : ?>
            <div class="alert alert-success py-2"><?php echo htmlspecialchars($success); ?></div>
          <?php endif; ?>

          <?php if (!empty($error)) : ?>
            <div class="alert alert-danger py-2"><?php echo $error; ?></div>
          <?php endif; ?>

          <!-- Add form -->
          <?php echo form_open(site_url('todo/add'), array('class' => 'row g-2 align-items-end')); ?>
            <div class="col-12 col-md-9">
              <label class="form-label">New action</label>
              <input
                type="text"
                name="action_title"
                class="form-control"
                placeholder="e.g., Finish tutorial exercises"
                value="<?php echo set_value('action_title'); ?>"
                required
              >
            </div>
            <div class="col-12 col-md-3 d-grid">
              <button class="btn btn-primary" type="submit">Add</button>
            </div>
          <?php echo form_close(); ?>

          <hr class="my-4">

          <!-- List -->
          <h2 class="h6 mb-3">Current actions</h2>

          <?php if (empty($actions)) : ?>
            <div class="alert alert-secondary mb-0">No actions yet. Add your first one above.</div>
          <?php else : ?>
            <ul class="list-group">
              <?php foreach ($actions as $a) : ?>
                <li class="list-group-item d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div class="fw-semibold"><?php echo htmlspecialchars($a->action_title); ?></div>
                    <div class="small text-muted">Added: <?php echo htmlspecialchars($a->created_at); ?></div>
                  </div>
                  <a class="btn btn-outline-danger btn-sm"
                     href="<?php echo site_url('todo/delete/' . $a->id); ?>"
                     onclick="return confirm('Delete this action?');">
                    Delete
                  </a>
                </li>
              <?php endforeach; ?>
            </ul>
          <?php endif; ?>

        </div>
      </div>

      <div class="text-center mt-3 small text-muted">
        Tip: open DevTools → Application/Storage → Cookies to see <code>ci_session</code>.
      </div>

    </div>
  </div>
</div>

</body>
</html>