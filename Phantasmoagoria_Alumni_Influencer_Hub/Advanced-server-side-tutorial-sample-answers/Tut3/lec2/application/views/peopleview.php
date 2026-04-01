<?php
defined('BASEPATH') or exit('No direct script access allowed');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>People Directory</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">

    <style type="text/css">
        :root {
            --ink: #0f172a;
            --muted: #475569;
            --accent: #f97316;
            --accent-2: #22d3ee;
            --paper: #fff7ed;
            --card: #ffffff;
            --shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: "Space Grotesk", Arial, sans-serif;
            color: var(--ink);
            background: radial-gradient(1200px 600px at 10% 10%, rgba(34, 211, 238, 0.2), transparent 60%),
                linear-gradient(120deg, #fff7ed 0%, #fef3c7 35%, #ffedd5 100%);
            min-height: 100vh;
        }

        .header {
            padding: 48px 24px 12px;
            text-align: center;
        }

        .header h1 {
            font-family: "DM Serif Display", "Times New Roman", serif;
            font-size: clamp(2rem, 4vw, 3.2rem);
            margin: 0 0 8px;
        }

        .header p {
            margin: 0;
            color: var(--muted);
        }

        .container {
            max-width: 980px;
            margin: 0 auto 60px;
            padding: 0 24px;
            display: grid;
            gap: 24px;
        }

        .card {
            background: var(--card);
            border-radius: 20px;
            box-shadow: var(--shadow);
            padding: 24px;
            animation: rise 500ms ease-out;
        }

        .card h2 {
            margin: 0 0 16px;
            font-size: 1.3rem;
        }

        .form-row {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }

        label {
            display: block;
            font-size: 0.9rem;
            color: var(--muted);
            margin-bottom: 6px;
        }

        input[type="text"],
        input[type="number"] {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            font-size: 1rem;
        }

        button {
            border: none;
            padding: 12px 18px;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
            background: linear-gradient(120deg, var(--accent), #fb7185);
            color: #ffffff;
            box-shadow: 0 10px 20px rgba(249, 115, 22, 0.3);
        }

        button.secondary {
            background: linear-gradient(120deg, var(--accent-2), #38bdf8);
            box-shadow: 0 10px 20px rgba(34, 211, 238, 0.3);
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }

        .table th,
        .table td {
            text-align: left;
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
        }

        .table th {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--muted);
        }

        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            background: #ffedd5;
            color: #9a3412;
            font-size: 0.85rem;
        }

        .message {
            padding: 10px 14px;
            border-radius: 12px;
            background: #ecfeff;
            color: #0e7490;
            margin-bottom: 12px;
        }

        @keyframes rise {
            from {
                transform: translateY(12px);
                opacity: 0;
            }

            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    </style>
</head>

<body>
    <header class="header">
        <h1>People Directory</h1>
        <p>Add new people or search the list.</p>
    </header>

    <main class="container">
        <div class="card">
            <h2>Add a Person</h2>
            <?php if (isset($message) && $message): ?>
                <div class="message"><?php echo htmlspecialchars($message, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>
            <form method="post" action="<?php echo site_url('PeopleController/add'); ?>">
                <div class="form-row">
                    <div>
                        <label for="person_name">Name</label>
                        <input type="text" id="person_name" name="name" placeholder="e.g. Taylor Swift" required>
                    </div>
                    <div>
                        <label for="person_age">Age</label>
                        <input type="number" id="person_age" name="age" min="0" max="130" placeholder="e.g. 34" required>
                    </div>
                </div>
                <div style="margin-top: 16px;">
                    <button type="submit">Add Person</button>
                </div>
            </form>
        </div>

        <div class="card">
            <h2>Find People</h2>
            <form method="get" action="<?php echo site_url('PeopleController/find'); ?>">
                <div class="form-row">
                    <div>
                        <label for="search_name">Name contains</label>
                        <input type="text" id="search_name" name="q" value="<?php echo isset($query) ? htmlspecialchars($query, ENT_QUOTES, 'UTF-8') : ''; ?>" placeholder="Search by name">
                    </div>
                    <div style="align-self: end;">
                        <button type="submit" class="secondary">Search</button>
                    </div>
                </div>
            </form>
            <?php if (isset($matches)): ?>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Age</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (count($matches) === 0): ?>
                            <tr>
                                <td colspan="2"><span class="badge">No matches</span></td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($matches as $person): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($person['name'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td><?php echo htmlspecialchars($person['age'], ENT_QUOTES, 'UTF-8'); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </main>
</body>

</html>