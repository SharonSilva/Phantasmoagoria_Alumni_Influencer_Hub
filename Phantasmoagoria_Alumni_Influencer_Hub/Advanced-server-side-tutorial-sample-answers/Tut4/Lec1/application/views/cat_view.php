<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>catnet</title>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
	<style>
		body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
		.wrap { display: flex; gap: 24px; max-width: 900px; margin: 0 auto; }
		.main { flex: 1; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); text-align: center; }
		.sidebar { width: 200px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
		h1 { font-size: 1.2em; color: #333; margin: 0 0 16px 0; }
		h2 { font-size: 1em; color: #555; margin: 0 0 12px 0; }
		.cat-img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
		.actions { margin: 16px 0; }
		.actions a { display: inline-block; margin: 0 16px; text-decoration: none; }
		.actions a:hover { opacity: 0.85; }
		.last-cat { display: block; margin-bottom: 12px; }
		.last-cat img { width: 100%; height: auto; border-radius: 6px; }
		.links { margin-top: 16px; }
		.links a { color: #3498db; }
	</style>
</head>
<body>
	<h1>catnet</h1>
	<div class="wrap">
		<div class="main">
			<?php if (!empty($cat)): ?>
				<h2>Here is a nice cat!</h2>
				<img class="cat-img" src="<?php echo htmlspecialchars($cat->image_url); ?>">
				<div class="actions">
					<a href="<?php echo site_url('Cats/vote/upvote/'.$cat->id); ?>" title="Like">
						<span style="font-size: 96px; color: DodgerBlue;"><i class="far fa-thumbs-up"></i></span>
					</a>
					<a href="<?php echo site_url('Cats/vote/downvote/'.$cat->id); ?>" title="Dislike">
						<span style="font-size: 96px; color: Red;"><i class="far fa-thumbs-down"></i></span>
					</a>
				</div>
			<?php else: ?>
				<p>No cats in database.</p>
			<?php endif; ?>
			<div class="links">
				<a href="<?php echo site_url('Cats/topliked'); ?>">View top liked cats</a>
			</div>
		</div>
		<div class="sidebar">
			<h2>Last 3 cats liked</h2>
			<?php if (!empty($viewed_cats)): ?>
				<?php foreach ($viewed_cats as $c): ?>
					<div class="last-cat">
						<img src="<?php echo htmlspecialchars($c->image_url); ?>">
					</div>
				<?php endforeach; ?>
			<?php else: ?>
				<p>None yet.</p>
			<?php endif; ?>
		</div>
	</div>
</body>
</html>
