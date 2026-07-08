<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');

        $usersQuery = User::with('userRole.role');

        if ($search) {
            $usersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $usersQuery->paginate(15)->through(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'role' => $user->userRole?->role?->name ?? 'guest',
                'role_id' => $user->userRole?->role?->id ?? null,
                'last_login_at' => $user->last_login_at?->format('Y-m-d H:i:s'),
            ];
        });

        $roles = Role::with('pages')->withCount('users')->get()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'allowed_customers' => $role->allowed_customers,
                'is_system' => $role->is_system,
                'page_ids' => $role->pages->pluck('id')->toArray(),
                'page_slugs' => $role->pages->pluck('slug')->toArray(),
                'user_count' => $role->users_count,
            ];
        });

        $pages = Page::all()->map(function ($page) {
            return [
                'id' => $page->id,
                'slug' => $page->slug,
                'label' => $page->label,
            ];
        });

        $currentUserId = $request->session()->get('auth_user')['user_id'] ?? null;

        return Inertia::render('Admin/Index', [
            'users' => $users,
            'roles' => $roles,
            'pages' => $pages,
            'search' => $search,
            'currentUserId' => $currentUserId,
        ]);
    }

    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'allowed_customers' => 'nullable|string',
            'pages' => 'nullable|array',
            'pages.*' => 'exists:pages,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'display_name' => $validated['display_name'],
            'description' => $validated['description'],
            'allowed_customers' => $this->parseCustomers($validated['allowed_customers'] ?? ''),
            'is_system' => false,
        ]);

        if (isset($validated['pages'])) {
            $role->pages()->sync($validated['pages']);
        }

        return redirect()->back()->with('success', 'Đã tạo quyền mới thành công.');
    }

    public function updateRole(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name,' . $role->id,
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'allowed_customers' => 'nullable|string',
            'pages' => 'nullable|array',
            'pages.*' => 'exists:pages,id',
        ]);

        $role->update([
            'name' => $validated['name'],
            'display_name' => $validated['display_name'],
            'description' => $validated['description'],
            'allowed_customers' => $this->parseCustomers($validated['allowed_customers'] ?? ''),
        ]);

        if (isset($validated['pages'])) {
            $role->pages()->sync($validated['pages']);
        } else {
            $role->pages()->detach();
        }

        return redirect()->back()->with('success', 'Đã cập nhật quyền thành công.');
    }

    public function destroyRole(Role $role)
    {
        if ($role->is_system) {
            return redirect()->back()->with('error', 'Không thể xóa quyền hệ thống.');
        }

        if ($role->users()->count() > 0) {
            return redirect()->back()->with('error', 'Không thể xóa quyền đang có người dùng.');
        }

        $role->delete();
        return redirect()->back()->with('success', 'Đã xóa quyền thành công.');
    }

    public function assignRole(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        $assignerId = $request->session()->get('auth_user')['user_id'] ?? null;

        if ($validated['user_id'] == $assignerId) {
            return redirect()->back()->with('error', 'Không thể tự đổi quyền của chính mình.');
        }

        UserRole::updateOrCreate(
            ['user_id' => $validated['user_id']],
            [
                'role_id' => $validated['role_id'],
                'assigned_by' => $assignerId,
            ]
        );

        return redirect()->back()->with('success', 'Đã phân quyền thành công.');
    }

    public function removeRole(Request $request, $id)
    {
        $assignerId = $request->session()->get('auth_user')['user_id'] ?? null;
        if ($id == $assignerId) {
            return redirect()->back()->with('error', 'Không thể tự gỡ quyền của chính mình.');
        }
        
        UserRole::where('user_id', $id)->delete();
        return redirect()->back()->with('success', 'Đã gỡ quyền của user.');
    }

    public function destroyUser(Request $request, $id)
    {
        $assignerId = $request->session()->get('auth_user')['user_id'] ?? null;
        if ($id == $assignerId) {
            return redirect()->back()->with('error', 'Không thể tự xóa chính mình.');
        }
        
        $user = User::findOrFail($id);
        if ($user->email === 'minhducqwe0123@gmail.com') {
            return redirect()->back()->with('error', 'Không thể xóa admin mặc định.');
        }

        $user->delete();
        return redirect()->back()->with('success', 'Đã xóa người dùng thành công.');
    }

    private function parseCustomers(string $input): array
    {
        $input = trim($input);
        if ($input === '') {
            return [];
        }
        if ($input === '*') {
            return ['*'];
        }
        return array_values(array_filter(array_map('trim', explode(',', $input))));
    }
}
