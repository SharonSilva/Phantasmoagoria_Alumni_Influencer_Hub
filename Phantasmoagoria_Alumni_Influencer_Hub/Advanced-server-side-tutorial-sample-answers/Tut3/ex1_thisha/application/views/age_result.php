<!DOCTYPE html>
<html>

<head>
  <title>Your Age</title>
</head>

<body>

  <h2>Age Result</h2>

  <p>Your age is <strong><?php echo $age; ?></strong> years.</p>

  <a href="<?php echo site_url('age'); ?>">
    Calculate again
  </a>

</body>

</html>