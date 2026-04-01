<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Top liked - catnet</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
		h1 { font-size: 1.2em; color: #333; }
		.cats { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; }
		.item { background: #fff; padding: 12px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); width: 180px; text-align: center; }
		.item img { width: 100%; height: auto; border-radius: 6px; }
		.item .name { font-weight: bold; margin: 8px 0 4px 0; }
		.item .likes { color: #3498db; }
		a.back { display: inline-block; margin-top: 20px; color: #3498db; }
	</style>
</head>
<body>
	<h1>catnet – Top liked cats</h1>
	<div class="cats">
		<?php foreach ((array)$cats as $c): ?>
			<div class="item">
				<img src="<?php echo htmlspecialchars($c->image_url); ?>">
				<div class="name"><?php echo htmlspecialchars($c->name); ?></div>
				<div class="likes"><?php echo (int)$c->like_count; ?> likes</div>
			</div>
		<?php endforeach; ?>
	</div>
	<p><?php echo empty($cats) ? 'No cats yet.' : ''; ?></p>
	<a class="back" href="<?php echo site_url('Cats'); ?>">Back to catnet</a>
</body>
</html>
