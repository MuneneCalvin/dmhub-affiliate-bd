<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class RolePermsSeeder extends Seeder
{
    public function run(): void
    {
        // ==========================================
        // ROLES
        // ==========================================
        $roles = [
            ['name' => 'super_admin', 'guard_name' => 'web'],
            ['name' => 'network_owner', 'guard_name' => 'web'],
            ['name' => 'advertiser', 'guard_name' => 'web'],
            ['name' => 'publisher', 'guard_name' => 'web'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['name' => $role['name']],
                [
                    'guard_name' => $role['guard_name'],
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]
            );
        }
        // PERMISSIONS
        $permissions = [
            // ----- Super Admin Permissions -----
            // Platform & Network Management
            ['name' => 'access_admin_dashboard', 'guard_name' => 'web'],
            ['name' => 'create_network', 'guard_name' => 'web'],
            ['name' => 'manage_networks', 'guard_name' => 'web'],
            ['name' => 'view_networks', 'guard_name' => 'web'],
            ['name' => 'manage_platform_settings', 'guard_name' => 'web'],
            ['name' => 'manage_system_users', 'guard_name' => 'web'],
            ['name' => 'view_audit_logs', 'guard_name' => 'web'],
            ['name' => 'handle_escalated_disputes', 'guard_name' => 'web'],
            ['name' => 'manage_roles', 'guard_name' => 'web'],
            ['name' => 'manage_permissions', 'guard_name' => 'web'],

            // ----- Network Owner Permissions -----
            // Network Management
            ['name' => 'access_network_dashboard', 'guard_name' => 'web'],
            ['name' => 'configure_network', 'guard_name' => 'web'],
            ['name' => 'create_offers', 'guard_name' => 'web'],
            ['name' => 'manage_offers', 'guard_name' => 'web'],
            ['name' => 'view_offers', 'guard_name' => 'web'],
            ['name' => 'view_network_invoices', 'guard_name' => 'web'],
            ['name' => 'approve_network_invoices', 'guard_name' => 'web'],

            // Publisher Management
            ['name' => 'approve_publishers', 'guard_name' => 'web'],
            ['name' => 'suspend_publishers', 'guard_name' => 'web'],
            ['name' => 'manage_publishers', 'guard_name' => 'web'],
            ['name' => 'view_publishers', 'guard_name' => 'web'],
            // Advertiser Management
            ['name' => 'approve_advertisers', 'guard_name' => 'web'],
            ['name' => 'manage_advertisers', 'guard_name' => 'web'],
            ['name' => 'view_advertisers', 'guard_name' => 'web'],
            // Analytics & Reports
            ['name' => 'view_network_analytics', 'guard_name' => 'web'],
            ['name' => 'view_network_reports', 'guard_name' => 'web'],
            // Pool (self-onboarded users)
            ['name' => 'access_pool', 'guard_name' => 'web'],
            // Application Management
            ['name' => 'review_applications', 'guard_name' => 'web'],
            ['name' => 'approve_applications', 'guard_name' => 'web'],
            ['name' => 'reject_applications', 'guard_name' => 'web'],

            // ----- Advertiser Permissions -----
            // Dashboard
            ['name' => 'access_advertiser_dashboard', 'guard_name' => 'web'],
            // Campaign Management
            ['name' => 'create_campaigns', 'guard_name' => 'web'],
            ['name' => 'manage_campaigns', 'guard_name' => 'web'],
            ['name' => 'view_campaigns', 'guard_name' => 'web'],
            ['name' => 'set_campaign_budgets', 'guard_name' => 'web'],
            ['name' => 'generate_tracking_links', 'guard_name' => 'web'],
            // Creatives
            ['name' => 'upload_creatives', 'guard_name' => 'web'],
            ['name' => 'manage_creatives', 'guard_name' => 'web'],
            // Analytics
            ['name' => 'view_campaign_performance', 'guard_name' => 'web'],
            ['name' => 'view_advertiser_reports', 'guard_name' => 'web'],

            // ----- Publisher Permissions -----
            // Dashboard
            ['name' => 'access_publisher_dashboard', 'guard_name' => 'web'],
            // Campaign Discovery
            ['name' => 'discover_campaigns', 'guard_name' => 'web'],
            ['name' => 'apply_to_campaigns', 'guard_name' => 'web'],
            ['name' => 'view_my_campaigns', 'guard_name' => 'web'],
            // Tracking & Conversions
            ['name' => 'share_tracking_links', 'guard_name' => 'web'],
            ['name' => 'view_conversions', 'guard_name' => 'web'],
            ['name' => 'view_earnings', 'guard_name' => 'web'],
            // Payouts & Invoices
            ['name' => 'request_payouts', 'guard_name' => 'web'],
            ['name' => 'manage_payouts', 'guard_name' => 'web'],
            ['name' => 'view_invoices', 'guard_name' => 'web'],
            ['name' => 'download_statements', 'guard_name' => 'web'],
            // Account & Sites
            ['name' => 'manage_publisher_account', 'guard_name' => 'web'],
            ['name' => 'manage_publisher_sites', 'guard_name' => 'web'],
            ['name' => 'view_account_balance', 'guard_name' => 'web'],

            ['name' => 'view_embeded_scripts', 'guard_name' => 'web']
        ];

        foreach ($permissions as $perm) {
            DB::table('permissions')->updateOrInsert(
                ['name' => $perm['name']],
                [
                    'guard_name' => $perm['guard_name'],
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]
            );
        }
        // ROLE-PERMISSION MAPPINGS
        $rolePermissionsMap = [
            'super_admin' => [

                // Full platform access
                'access_admin_dashboard',
                'create_network',
                'manage_networks',
                'view_networks',
                'manage_platform_settings',
                'manage_system_users',
                'view_audit_logs',
                'handle_escalated_disputes',
                'manage_roles',
                'manage_permissions',
                // Network owner permissions (super admin has all)

                // 'access_network_dashboard',
                // 'configure_network',
                // 'create_offers',
                // 'manage_offers',
                // 'view_offers',
                'approve_publishers',
                'suspend_publishers',
                'manage_publishers',
                'view_publishers',
                'approve_advertisers',
                'manage_advertisers',
                'view_advertisers',
                // 'view_network_analytics',
                // 'view_network_reports',
                'access_pool',

                // Application Management
                'review_applications',
                'approve_applications',
                'reject_applications',

                // Advertiser permissions
                // 'access_advertiser_dashboard',
                // 'create_campaigns',
                // 'manage_campaigns',
                // 'view_campaigns',
                // 'set_campaign_budgets',
                'upload_creatives',
                'manage_creatives',
                'view_campaign_performance',
                'view_advertiser_reports',

                // Publisher permissions
                // 'access_publisher_dashboard',
                // 'discover_campaigns',
                // 'apply_to_campaigns',
                // 'view_my_campaigns',
                'share_tracking_links',
                'generate_tracking_links',
                'view_conversions',

                // 'view_earnings',
                'request_payouts',
                'manage_payouts',
                // 'view_invoices',
                'download_statements',
                'manage_publisher_account',
                'manage_publisher_sites',
                'view_account_balance',

                // approve network invoice
                'approve_network_invoices'
            ],

            'network_owner' => [
                // Network dashboard & config
                'access_network_dashboard',
                'configure_network',
                // Offers
                'create_offers',
                'manage_offers',
                'view_offers',
                // Publishers
                'approve_publishers',
                'suspend_publishers',
                'manage_publishers',
                'view_publishers',
                // Advertisers
                'approve_advertisers',
                'manage_advertisers',
                'view_advertisers',

                // Analytics
                'view_network_analytics',
                'view_network_reports',
                // Pool
                'access_pool',
                // Application Management
                'review_applications',
                'approve_applications',
                'reject_applications',

                // invoices
                'view_network_invoices',
            ],

            'advertiser' => [
                // Dashboard
                'access_advertiser_dashboard',
                // Campaigns
                'create_campaigns',
                'manage_campaigns',
                'view_campaigns',
                'set_campaign_budgets',
                'generate_tracking_links',
                // Creatives
                'upload_creatives',
                'manage_creatives',
                // Analytics
                'view_campaign_performance',
                'view_advertiser_reports',
                // View offers to link campaigns
                'view_offers',
                // 'view_embeded_scripts'
            ],

            'publisher' => [
                // Dashboard
                'access_publisher_dashboard',
                // Campaigns
                'discover_campaigns',
                'apply_to_campaigns',
                'view_my_campaigns',
                'view_offers',
                // Tracking & Conversions
                'share_tracking_links',
                'view_conversions',
                'view_earnings',
                'generate_tracking_links',
                // Payouts & Invoices
                'request_payouts',
                'manage_payouts',
                'view_invoices',
                'download_statements',
                // Account
                'manage_publisher_account',
                'manage_publisher_sites',
                'view_account_balance',
                'view_embeded_scripts'
            ],
        ];

        foreach ($rolePermissionsMap as $roleName => $permissionsList) {
            $role = DB::table('roles')->where('name', $roleName)->first();

            if (!$role) {
                continue;
            }

            foreach ($permissionsList as $permName) {
                $perm = DB::table('permissions')->where('name', $permName)->first();

                if (!$perm) {
                    continue;
                }

                DB::table('role_has_permissions')->updateOrInsert(
                    [
                        'role_id' => $role->id,
                        'permission_id' => $perm->id,
                    ],
                );
            }
        }

        // ==========================================
        // USER ROLES (based on user boolean flags)
        // ==========================================
        $roleMapping = [
            'is_super_admin' => 'super_admin',
            'is_network' => 'network_owner',
            'is_advertiser' => 'advertiser',
            'is_publisher' => 'publisher',
        ];

        $users = DB::table('users')->get();
        foreach ($users as $user) {
            foreach ($roleMapping as $flag => $roleName) {
                if ($user->$flag) {
                    $role = DB::table('roles')->where('name', $roleName)->first();
                    if ($role) {
                        DB::table('user_roles')->updateOrInsert(
                            [
                                'user_id' => $user->id,
                                'role_id' => $role->id,
                            ],
                            [
                                'created_at' => Carbon::now(),
                                'updated_at' => Carbon::now(),
                            ]
                        );
                    }
                }
            }
        }
    }
}
