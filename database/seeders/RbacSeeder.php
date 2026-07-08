<?php

namespace Database\Seeders;

use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        // --- Create system roles ---
        $admin = Role::firstOrCreate(
            ['name' => 'admin'],
            [
                'display_name' => 'Quản trị viên',
                'description' => 'Toàn quyền truy cập hệ thống, quản lý phân quyền',
                'allowed_customers' => ['*'],
                'is_system' => true,
            ]
        );

        $viewer = Role::firstOrCreate(
            ['name' => 'viewer'],
            [
                'display_name' => 'Người xem',
                'description' => 'Xem báo cáo và dữ liệu, không quản lý hệ thống',
                'allowed_customers' => ['*'],
                'is_system' => true,
            ]
        );

        $guest = Role::firstOrCreate(
            ['name' => 'guest'],
            [
                'display_name' => 'Khách',
                'description' => 'Chưa được cấp quyền, liên hệ admin',
                'allowed_customers' => [],
                'is_system' => true,
            ]
        );

        // --- Create pages ---
        $reportPage = Page::firstOrCreate(
            ['slug' => 'report'],
            ['label' => 'Báo cáo', 'route_name' => 'report.index']
        );

        $topCampaignPage = Page::firstOrCreate(
            ['slug' => 'top-campaign'],
            ['label' => 'Top QC', 'route_name' => 'top.index']
        );

        $comparePage = Page::firstOrCreate(
            ['slug' => 'compare'],
            ['label' => 'So sánh', 'route_name' => 'compare.index']
        );

        $adminPage = Page::firstOrCreate(
            ['slug' => 'admin-panel'],
            ['label' => 'Quản lý phân quyền', 'route_name' => 'admin.index']
        );

        // --- Assign pages to roles ---
        $admin->pages()->syncWithoutDetaching([
            $reportPage->id,
            $topCampaignPage->id,
            $comparePage->id,
            $adminPage->id,
        ]);

        $viewer->pages()->syncWithoutDetaching([
            $reportPage->id,
            $topCampaignPage->id,
        ]);

        // guest gets no pages

        // --- Create default admin user ---
        $adminUser = User::firstOrCreate(
            ['email' => 'minhducqwe0123@gmail.com'],
            [
                'name' => 'Admin',
                'password' => null,
            ]
        );

        UserRole::firstOrCreate(
            ['user_id' => $adminUser->id],
            [
                'role_id' => $admin->id,
                'assigned_by' => null,
            ]
        );
    }
}
