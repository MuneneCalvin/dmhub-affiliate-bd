<?php

return [
    // Written into both production images during the build; never taken from runtime env.
    'revision' => is_file(base_path('REVISION')) ? trim(file_get_contents(base_path('REVISION'))) : 'development',
];
