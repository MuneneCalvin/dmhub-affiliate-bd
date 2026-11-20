<?php

it('does not expose the design-system gallery outside local environments', function () {
    expect(app()->isLocal())->toBeFalse();

    $this->get('/dev/ui')->assertNotFound();
});
