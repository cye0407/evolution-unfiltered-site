<?php
/**
 * Plugin Name: Evolution Unfiltered Notes Feed
 * Plugin URI: https://evolutionunfiltered.com/
 * Description: Renders the Git-automated Substack notes JSON feed inside WordPress via shortcode.
 * Version: 0.1.2
 * Author: Cat Yeldi / Codex
 * License: GPL-2.0-or-later
 * Requires at least: 4.7
 * Requires PHP: 5.6
 */

if (!defined('ABSPATH')) {
    exit;
}

final class EU_Notes_Feed {
    const VERSION = '0.1.2';
    const SHORTCODE = 'eu_notes_feed';
    const CACHE_PREFIX = 'eu_notes_feed_';
    const DEFAULT_LIMIT = 12;
    const DEFAULT_CACHE_TTL = 900;

    private static $style_printed = false;

    public static function init() {
        add_shortcode(self::SHORTCODE, array(__CLASS__, 'render_shortcode'));
    }

    public static function render_shortcode($atts = array()) {
        $atts = shortcode_atts(
            array(
                'url' => '',
                'limit' => self::DEFAULT_LIMIT,
                'show_source' => 'true',
                'show_date' => 'true',
                'empty_message' => 'No notes available yet.',
                'cache_ttl' => self::DEFAULT_CACHE_TTL,
            ),
            $atts,
            self::SHORTCODE
        );

        $url = esc_url_raw(trim((string) $atts['url']));
        if ($url === '') {
            return '<p>Notes feed URL is missing.</p>';
        }

        $limit = max(1, min(50, intval($atts['limit'])));
        $show_source = self::to_bool($atts['show_source']);
        $show_date = self::to_bool($atts['show_date']);
        $cache_ttl = max(60, intval($atts['cache_ttl']));

        $payload = self::fetch_feed($url, $cache_ttl);

        if (is_wp_error($payload)) {
            return '<p>Unable to load notes right now.</p>';
        }

        $items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : array();
        if (!$items) {
            return '<p>' . esc_html($atts['empty_message']) . '</p>';
        }

        usort($items, array(__CLASS__, 'sort_items_by_date_desc'));
        $items = array_slice($items, 0, $limit);

        ob_start();
        echo self::styles();
        ?>
        <div class="eu-notes-feed">
            <?php foreach ($items as $item) : ?>
                <?php
                $title = isset($item['title']) ? (string) $item['title'] : '';
                $content = isset($item['content']) ? (string) $item['content'] : '';
                $source_name = isset($item['source_name']) ? (string) $item['source_name'] : '';
                $character = isset($item['character']) ? (string) $item['character'] : '';
                $arc = isset($item['arc']) ? (string) $item['arc'] : '';
                $url_value = isset($item['url']) ? esc_url($item['url']) : '';
                $date_value = isset($item['date']) ? (string) $item['date'] : '';
                ?>
                <article class="eu-notes-feed__item">
                    <?php if ($show_date && $date_value !== '') : ?>
                        <time class="eu-notes-feed__date" datetime="<?php echo esc_attr($date_value); ?>">
                            <?php echo esc_html(self::format_date($date_value)); ?>
                        </time>
                    <?php endif; ?>

                    <?php if ($title !== '') : ?>
                        <h3 class="eu-notes-feed__title">
                            <?php if ($url_value !== '') : ?>
                                <a href="<?php echo $url_value; ?>" target="_blank" rel="noopener noreferrer">
                                    <?php echo esc_html($title); ?>
                                </a>
                            <?php else : ?>
                                <?php echo esc_html($title); ?>
                            <?php endif; ?>
                        </h3>
                    <?php endif; ?>

                    <?php if ($content !== '') : ?>
                        <p class="eu-notes-feed__content"><?php echo esc_html($content); ?></p>
                    <?php endif; ?>

                    <?php if ($show_source || $character !== '' || $arc !== '') : ?>
                        <div class="eu-notes-feed__meta">
                            <?php if ($show_source && $source_name !== '') : ?>
                                <span><?php echo esc_html($source_name); ?></span>
                            <?php endif; ?>
                            <?php if ($character !== '') : ?>
                                <span><?php echo esc_html($character); ?></span>
                            <?php endif; ?>
                            <?php if ($arc !== '') : ?>
                                <span><?php echo esc_html($arc); ?></span>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>
        <?php

        return ob_get_clean();
    }

    private static function styles() {
        if (self::$style_printed) {
            return '';
        }
        self::$style_printed = true;

        return '<style id="eu-notes-feed-css">'
            . '.eu-notes-feed{display:grid;gap:1.25rem}'
            . '.eu-notes-feed__item{padding:1rem 0;border-top:1px solid rgba(127,127,127,.2)}'
            . '.eu-notes-feed__item:first-child{border-top:0;padding-top:0}'
            . '.eu-notes-feed__date{display:inline-block;margin-bottom:.4rem;font-size:.9em;opacity:.75}'
            . '.eu-notes-feed__title{margin:0 0 .45rem;font-size:1.1em}'
            . '.eu-notes-feed__title a{text-decoration:none}'
            . '.eu-notes-feed__content{margin:0}'
            . '.eu-notes-feed__meta{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem;font-size:.85em;opacity:.8}'
            . '.eu-notes-feed__meta span{padding:.15rem .5rem;border:1px solid rgba(127,127,127,.24);border-radius:999px}'
            . '</style>';
    }

    private static function fetch_feed($url, $cache_ttl) {
        $cache_key = self::CACHE_PREFIX . md5($url);
        $cached = get_transient($cache_key);

        if (is_array($cached)) {
            return $cached;
        }

        $response = wp_remote_get(
            $url,
            array(
                'timeout' => 15,
                'headers' => array(
                    'Accept' => 'application/json',
                ),
            )
        );

        if (is_wp_error($response)) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code < 200 || $code >= 300) {
            return new WP_Error('eu_notes_feed_http_error', 'Unexpected feed response.', array('status' => $code));
        }

        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);

        if (!is_array($decoded)) {
            return new WP_Error('eu_notes_feed_invalid_json', 'Invalid feed JSON.');
        }

        set_transient($cache_key, $decoded, $cache_ttl);
        return $decoded;
    }

    private static function sort_items_by_date_desc($a, $b) {
        $a_date = isset($a['date']) ? strtotime((string) $a['date']) : 0;
        $b_date = isset($b['date']) ? strtotime((string) $b['date']) : 0;
        if ($b_date == $a_date) {
            return 0;
        }

        return ($b_date > $a_date) ? 1 : -1;
    }

    private static function format_date($value) {
        $timestamp = strtotime($value);
        if (!$timestamp) {
            return $value;
        }

        return date_i18n(get_option('date_format'), $timestamp);
    }

    private static function to_bool($value) {
        return in_array(strtolower((string) $value), array('1', 'true', 'yes', 'on'), true);
    }
}

EU_Notes_Feed::init();
