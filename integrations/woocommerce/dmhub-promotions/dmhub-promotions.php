<?php

use Automattic\WooCommerce\Utilities\FeaturesUtil;

/**
 * Plugin Name: DM Hub Customer Promotions
 * Description: Configurable affiliate customer offers and verified order reporting for DM Hub.
 * Version: 0.1.0
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 * WC requires at least: 8.8
 * Text Domain: dmhub-promotions
 */
if (! defined('ABSPATH')) {
    exit;
}

add_action('before_woocommerce_init', function () {
    if (class_exists(FeaturesUtil::class)) {
        FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
        FeaturesUtil::declare_compatibility('cart_checkout_blocks', __FILE__, true);
    }
});

final class DMHub_Promotions
{
    private static bool $applying = false;

    public static function boot(): void
    {
        add_action('admin_menu', [self::class, 'menu']);
        add_action('admin_post_dmhub_connect', [self::class, 'connect']);
        add_action('template_redirect', [self::class, 'landing'], 1);
        add_action('wp_enqueue_scripts', [self::class, 'assets']);
        add_action('wc_ajax_dmhub_offer', [self::class, 'capture']);
        add_action('woocommerce_before_calculate_totals', [self::class, 'apply'], 20);
        add_filter('woocommerce_coupon_get_items_to_apply', [self::class, 'discount_items'], 10, 3);
        add_filter('woocommerce_coupon_is_valid', [self::class, 'valid'], 10, 3);
        add_filter('woocommerce_cart_totals_coupon_label', [self::class, 'label'], 10, 2);
        add_action('woocommerce_checkout_create_order', [self::class, 'order_meta']);
        add_action('woocommerce_store_api_checkout_update_order_meta', [self::class, 'order_meta']);
        add_action('woocommerce_payment_complete', [self::class, 'paid']);
        add_action('woocommerce_order_refunded', [self::class, 'refunded'], 10, 2);
        add_action('woocommerce_order_status_cancelled', [self::class, 'cancelled']);
        add_action('dmhub_deliver', [self::class, 'deliver'], 10, 4);
        add_action('admin_notices', [self::class, 'notice']);
    }

    public static function api(string $path, array $payload)
    {
        $base = get_option('dmhub_api_url', '');
        $key = get_option('dmhub_connection_key', '');
        if (! $base || ! $key) {
            return new WP_Error('not_connected', 'DM Hub is not connected.');
        }
        $response = wp_safe_remote_post(rtrim($base, '/').'/'.$path, ['timeout' => 15, 'redirection' => 0,
            'headers' => ['Authorization' => 'Bearer '.$key, 'Content-Type' => 'application/json', 'Accept' => 'application/json'], 'body' => wp_json_encode($payload)]);
        if (is_wp_error($response)) {
            return $response;
        }
        $status = wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) {
            return new WP_Error('dmhub_'.$status, 'DM Hub request failed ('.$status.').', ['status' => $status]);
        }
        $body = json_decode(wp_remote_retrieve_body($response), true);

        return is_array($body) ? $body : new WP_Error('invalid_response', 'Invalid DM Hub response.');
    }

    public static function menu(): void
    {
        add_submenu_page('woocommerce', 'DM Hub', 'DM Hub', 'manage_woocommerce', 'dmhub-promotions', [self::class, 'settings']);
    }

    public static function settings(): void
    {
        if (! current_user_can('manage_woocommerce')) {
            return;
        }
        echo '<div class="wrap"><h1>DM Hub Customer Promotions</h1><p>'.esc_html__('Connect this store using the API URL and connection key from your DM Hub campaign. Discount rules are managed in DM Hub.', 'dmhub-promotions').'</p>';
        echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'"><input type="hidden" name="action" value="dmhub_connect">';
        wp_nonce_field('dmhub_connect');
        echo '<p><label>DM Hub API URL <input class="regular-text" required type="url" name="api_url" value="'.esc_attr(get_option('dmhub_api_url', '')).'"></label></p>';
        echo '<p><label>Connection key <input class="regular-text" required type="password" autocomplete="new-password" name="connection_key"></label></p>';
        submit_button(__('Connect store', 'dmhub-promotions'));
        echo '</form><p>'.esc_html(get_option('dmhub_connection_status', '')).'</p></div>';
    }

    public static function connect(): void
    {
        if (! current_user_can('manage_woocommerce')) {
            wp_die('Forbidden', '', ['response' => 403]);
        }
        check_admin_referer('dmhub_connect');
        if (! wc_coupons_enabled()) {
            wp_die(esc_html__('Enable coupons in WooCommerce settings before connecting customer promotions.', 'dmhub-promotions'));
        }
        $url = esc_url_raw(wp_unslash($_POST['api_url'] ?? ''));
        if (wp_parse_url($url, PHP_URL_SCHEME) !== 'https' || ! wp_http_validate_url($url)) {
            wp_die('Use a public HTTPS API URL.');
        }
        update_option('dmhub_api_url', rtrim($url, '/'), false);
        update_option('dmhub_connection_key', sanitize_text_field(wp_unslash($_POST['connection_key'] ?? '')), false);
        $result = self::api('connect', ['domain' => wp_parse_url(home_url(), PHP_URL_HOST), 'currency' => get_woocommerce_currency()]);
        update_option('dmhub_connection_status', is_wp_error($result) ? $result->get_error_message() : 'Connected', false);
        wp_safe_redirect(admin_url('admin.php?page=dmhub-promotions'));
        exit;
    }

    public static function assets(): void
    {
        if (! get_option('dmhub_connection_key')) {
            return;
        }
        wp_enqueue_script('dmhub-promotions', plugins_url('assets/offer.js', __FILE__), [], '0.1.0', true);
        wp_localize_script('dmhub-promotions', 'dmhubOffer', ['url' => WC_AJAX::get_endpoint('dmhub_offer'), 'dismiss' => __('Dismiss', 'dmhub-promotions')]);
        wp_enqueue_style('dmhub-promotions', plugins_url('assets/offer.css', __FILE__), [], '0.1.0');
    }

    private static function grant(): ?array
    {
        if (! wc_coupons_enabled()) {
            return null;
        }
        $grant = WC()->session ? WC()->session->get('dmhub_grant') : null;

        return is_array($grant) && strtotime($grant['expires_at']) > time() ? $grant : null;
    }

    public static function capture(): void
    {
        nocache_headers();
        // Same-origin POST prevents another website from replacing this customer's affiliate selection.
        $origin = get_http_origin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ! $origin || untrailingslashit($origin) !== untrailingslashit(wp_parse_url(home_url(), PHP_URL_SCHEME).'://'.wp_parse_url(home_url(), PHP_URL_HOST).(wp_parse_url(home_url(), PHP_URL_PORT) ? ':'.wp_parse_url(home_url(), PHP_URL_PORT) : ''))) {
            wp_send_json_error([], 403);
        }
        if (! WC()->session || ! WC()->cart) {
            wp_send_json_error([], 503);
        }
        self::accept_referral(sanitize_text_field(wp_unslash($_POST['referral_id'] ?? '')));
        WC()->cart->calculate_totals();
        $grant = self::grant();
        if (! $grant) {
            wp_send_json_success(['grant' => null]);
        }
        $saving = WC()->cart->get_coupon_discount_amount(strtolower($grant['code']), true);
        wp_send_json_success(['grant' => $grant, 'saving' => $saving, 'currency' => get_woocommerce_currency(), 'eligible' => self::eligible($grant), 'empty' => WC()->cart->is_empty(), 'applied' => WC()->cart->has_discount($grant['code'])]);
    }

    public static function landing(): void
    {
        if (! isset($_GET['referral_id']) || ! WC()->session || ! WC()->cart || ! get_option('dmhub_connection_key')) {
            return;
        }
        nocache_headers();
        self::accept_referral(sanitize_text_field(wp_unslash($_GET['referral_id'])));
        WC()->cart->calculate_totals();
    }

    private static function accept_referral(string $referral): void
    {
        if (! wc_coupons_enabled()) {
            return;
        }
        $session = WC()->session->get('dmhub_session');
        if (! $session) {
            $session = wp_generate_uuid4();
            WC()->session->set('dmhub_session', $session);
        }
        WC()->session->set_customer_session_cookie(true);
        $previous = self::grant();
        if ($referral && preg_match('/^[a-f0-9-]{36}$/iD', $referral) && (! $previous || $previous['referral_id'] !== $referral)) {
            $grant = self::api('grants', ['referral_id' => $referral, 'session' => $session]);
            if (! is_wp_error($grant) && isset($grant['configuration'], $grant['id']) && (! $previous || strtotime($grant['clicked_at']) >= strtotime($previous['clicked_at']))) {
                if ($previous) {
                    WC()->cart->remove_coupon($previous['code']);
                }
                WC()->session->set('dmhub_grant', $grant);
                self::coupon($grant);
            }
        }
    }

    private static function coupon(array $g): void
    {
        if (wc_get_coupon_id_by_code($g['code'])) {
            return;
        }
        $c = $g['configuration'];
        $coupon = new WC_Coupon;
        $coupon->set_code($g['code']);
        $coupon->set_description($c['name']);
        $coupon->set_discount_type($c['type'] === 'percentage' ? 'percent' : 'fixed_cart');
        $coupon->set_amount($c['value']);
        $coupon->set_usage_limit($c['usage_limit'] ?? 0);
        $coupon->set_date_expires(strtotime($g['expires_at']));
        $coupon->set_individual_use(! $c['combines_with_other_discounts']);
        // Fixed-cart coupons otherwise distribute savings over every cart line. Filter eligible
        // items before WooCommerce allocates the fixed amount, preserving native rounding.
        if ($c['type'] === 'percentage') {
            $coupon->set_exclude_sale_items($c['exclude_sale_items']);
            $coupon->set_product_ids($c['scope'] === 'products' ? array_map('intval', $c['product_ids']) : []);
            $coupon->set_product_categories($c['scope'] === 'categories' ? array_map('intval', $c['category_ids']) : []);
            $coupon->set_excluded_product_ids(array_map('intval', $c['excluded_product_ids']));
        }
        $coupon->update_meta_data('_dmhub_configuration', $c);
        $coupon->update_meta_data('_dmhub_grant', $g['id']);
        $coupon->save();
    }

    private static function eligible_product($product, array $c): bool
    {
        $ids = [$product->get_id(), $product->get_parent_id()];
        if (array_intersect($ids, $c['excluded_product_ids']) || ($c['exclude_sale_items'] && $product->is_on_sale())) {
            return false;
        }
        if ($c['scope'] === 'products' && ! array_intersect($ids, $c['product_ids'])) {
            return false;
        }
        if ($c['scope'] === 'categories' && ! array_intersect(wc_get_product_cat_ids($product->get_parent_id() ?: $product->get_id()), $c['category_ids'])) {
            return false;
        }

        return true;
    }

    public static function discount_items(array $items, $coupon, $discounts): array
    {
        if (! $coupon->get_meta('_dmhub_grant')) {
            return $items;
        }
        $c = $coupon->get_meta('_dmhub_configuration');
        if (! is_array($c)) {
            return [];
        }

        return array_values(array_filter($items, fn ($item) => self::eligible_product($item->product, $c)));
    }

    public static function eligible(array $g): bool
    {
        $c = $g['configuration'];
        $subtotal = 0;
        $quantity = 0;
        if ($c['currency'] !== get_woocommerce_currency()) {
            return false;
        }
        foreach (WC()->cart->get_cart() as $item) {
            $product = $item['data'];
            if (! self::eligible_product($product, $c)) {
                continue;
            }
            $quantity += $item['quantity'];
            $subtotal += (int) round(wc_get_price_excluding_tax($product, ['qty' => $item['quantity']]) * 100);
        }

        return $quantity > 0 && $quantity >= (int) $c['minimum_quantity'] && $subtotal >= (int) round((float) $c['minimum_subtotal'] * 100);
    }

    public static function valid(bool $valid, $coupon, $discounts): bool
    {
        $id = $coupon->get_meta('_dmhub_grant');
        if (! $id) {
            return $valid;
        }
        $g = self::grant();

        return $valid && $g && hash_equals($g['id'], $id) && self::eligible($g);
    }

    public static function apply($cart): void
    {
        if (self::$applying || ! WC()->session) {
            return;
        }
        self::$applying = true;
        try {
            $g = self::grant();
            if ($g) {
                $native = new WC_Coupon($g['code']);
                if ($native->get_usage_limit() && $native->get_usage_count() >= $native->get_usage_limit()) {
                    WC()->session->set('dmhub_grant', null);
                    $g = null;
                }
            }
            foreach ($cart->get_applied_coupons() as $code) {
                $coupon = new WC_Coupon($code);
                if ($coupon->get_meta('_dmhub_grant') && (! $g || strtolower($g['code']) !== $code || ! self::eligible($g))) {
                    $cart->remove_coupon($code);
                }
            }
            if ($g && self::eligible($g) && ! $cart->has_discount($g['code'])) {
                // Respect an existing exclusive coupon; don't silently remove a customer's selected saving.
                if (! $g['configuration']['combines_with_other_discounts'] && count($cart->get_applied_coupons())) {
                    return;
                }
                self::coupon($g);
                $cart->apply_coupon($g['code']);
            }
        } finally {
            self::$applying = false;
        }
    }

    public static function label($label, $coupon)
    {
        return $coupon->get_meta('_dmhub_grant') ? esc_html($coupon->get_description()) : $label;
    }

    public static function order_meta($order): void
    {
        $g = self::grant();
        if (! $g || ! WC()->cart->has_discount($g['code'])) {
            return;
        }
        // Confirm grant ownership immediately before creating the order. Existing grants survive a pause.
        $validated = self::api('grants/'.$g['id'], ['session' => WC()->session->get('dmhub_session')]);
        if (is_wp_error($validated) && in_array((int) ($validated->get_error_data()['status'] ?? 0), [401, 403, 404, 409, 422], true)) {
            WC()->session->set('dmhub_grant', null);
            WC()->cart->remove_coupon($g['code']);
            WC()->cart->calculate_totals();
            throw new Exception(__('Your offer is no longer available. Please review the updated cart before completing payment.', 'dmhub-promotions'));
        }
        // A network outage does not revoke an already validated, unexpired grant.
        $order->update_meta_data('_dmhub_grant', $g['id']);
        $order->update_meta_data('_dmhub_referral_id', $g['referral_id']);
        $order->update_meta_data('_dmhub_code', strtolower($g['code']));
    }

    public static function paid($order_id): void
    {
        $order = wc_get_order($order_id);
        if (! $order || ! $order->is_paid() || ! $order->get_date_paid() || ! $order->get_meta('_dmhub_grant')) {
            return;
        }
        if (! $order->get_meta('_dmhub_order_payload')) {
            $saving = 0;
            foreach ($order->get_items('coupon') as $coupon) {
                if (strtolower($coupon->get_code()) === $order->get_meta('_dmhub_code')) {
                    $saving += (float) $coupon->get_discount();
                }
            }
            $payload = ['external_id' => (string) $order->get_id(), 'grant_id' => $order->get_meta('_dmhub_grant'),
                'paid_at' => gmdate('Y-m-d\TH:i:s\Z', $order->get_date_paid()->getTimestamp()), 'currency' => $order->get_currency(),
                'subtotal' => wc_format_decimal($order->get_subtotal(), 2), 'discount' => wc_format_decimal($order->get_discount_total(), 2),
                'promotion_discount' => wc_format_decimal($saving, 2), 'shipping' => wc_format_decimal($order->get_shipping_total(), 2),
                'tax' => wc_format_decimal($order->get_total_tax(), 2), 'total' => wc_format_decimal($order->get_total(), 2)];
            $order->update_meta_data('_dmhub_order_payload', $payload);
            $order->save();
        }
        self::queue($order->get_id(), 'orders', '_dmhub_order_payload', 0);
    }

    public static function refunded($order_id, $refund_id): void
    {
        $order = wc_get_order($order_id);
        $refund = wc_get_order($refund_id);
        if (! $order || ! $refund || ! $order->get_meta('_dmhub_grant')) {
            return;
        }
        $key = '_dmhub_refund_'.$refund_id;
        if (! $order->get_meta($key)) {
            $order->update_meta_data($key, ['external_id' => 'refund:'.$refund_id, 'order_external_id' => (string) $order_id, 'type' => 'refund', 'amount' => wc_format_decimal($refund->get_amount(), 2), 'currency' => $order->get_currency()]);
            $order->save();
        }
        self::queue($order_id, 'adjustments', $key, 0);
    }

    public static function cancelled($order_id): void
    {
        $order = wc_get_order($order_id);
        if (! $order || ! $order->get_meta('_dmhub_grant')) {
            return;
        }
        $key = '_dmhub_cancellation';
        if (! $order->get_meta($key)) {
            $order->update_meta_data($key, ['external_id' => 'cancel:'.$order_id, 'order_external_id' => (string) $order_id, 'type' => 'cancellation', 'amount' => '0.00', 'currency' => $order->get_currency()]);
            $order->save();
        }
        self::queue($order_id, 'adjustments', $key, 0);
    }

    private static function queue($order_id, $path, $key, $attempt): void
    {
        if (function_exists('as_schedule_single_action')) {
            as_schedule_single_action(time() + min(3600, 30 * (2 ** min($attempt, 7))), 'dmhub_deliver', [$order_id, $path, $key, $attempt], 'dmhub-promotions', true);
        }
    }

    public static function deliver($order_id, $path, $key, $attempt): void
    {
        $order = wc_get_order($order_id);
        if (! $order || $order->get_meta($key.'_delivered')) {
            return;
        }
        $payload = $order->get_meta($key);
        if (! is_array($payload)) {
            return;
        }
        $result = self::api($path, $payload);
        if (is_wp_error($result)) {
            $order->update_meta_data($key.'_error', $result->get_error_message());
            $order->save();
            // Durable backoff continues until an administrator fixes the connection or payload.
            self::queue($order_id, $path, $key, $attempt + 1);
            update_option('dmhub_delivery_error', 'Order '.$order_id.': '.$result->get_error_message(), false);

            return;
        }
        $order->update_meta_data($key.'_delivered', $result['status'] ?? 'received');
        $order->delete_meta_data($key.'_error');
        $order->save();
    }

    public static function notice(): void
    {
        if (current_user_can('manage_woocommerce') && get_option('dmhub_delivery_error')) {
            echo '<div class="notice notice-warning"><p>'.esc_html(get_option('dmhub_delivery_error')).' '.esc_html__('Review DM Hub actions under WooCommerce Scheduled Actions.', 'dmhub-promotions').'</p></div>';
        }
    }
}
add_action('plugins_loaded', function () {
    if (class_exists('WooCommerce')) {
        DMHub_Promotions::boot();
    }
});
