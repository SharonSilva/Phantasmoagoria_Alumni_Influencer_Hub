<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Tut5 Lec3 API Docs</title>
    <link rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>

<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
    window.onload = () => {
        window.ui = SwaggerUIBundle({
            url: '<?php echo base_url("openapi.json"); ?>',
            dom_id: '#swagger-ui'
        });
    };
</script>
</body>
</html>

