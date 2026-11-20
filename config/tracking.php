<?php

return [
    // Reject implausibly fast submissions. Measured by the client's backend.
    'minimum_form_duration_ms' => (int) env('TRACKING_MINIMUM_FORM_DURATION_MS', 1000),
];
