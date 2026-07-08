<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to Google OAuth consent screen.
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Handle callback from Google OAuth.
     * Upsert user in SQLite, resolve role from DB, store in session.
     */
    public function handleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect('/login')->with('error', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        }

        $email = $googleUser->getEmail();

        // Upsert user in SQLite
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $googleUser->getName(),
                'avatar' => $googleUser->getAvatar(),
                'google_id' => $googleUser->getId(),
                'last_login_at' => now(),
            ]
        );

        // Resolve role from DB
        $accessData = $this->resolvePermissions($user);

        Session::put('auth_user', [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $email,
            'avatar' => $user->avatar,
            'role' => $accessData['role_name'],
            'allowed_customers' => $accessData['allowed_customers'],
            'allowed_pages' => $accessData['allowed_pages'],
        ]);

        if (empty($accessData['allowed_pages'])) {
            return redirect('/unauthorized');
        }

        return redirect('/report');
    }

    /**
     * Clear session and redirect to login.
     */
    public function logout()
    {
        Session::forget('auth_user');
        Session::invalidate();
        Session::regenerateToken();

        return redirect('/login');
    }

    /**
     * Resolve user's role, allowed_customers, and allowed_pages from DB.
     * If user has no role assigned, assign 'guest' by default.
     */
    private function resolvePermissions(User $user): array
    {
        $userRole = $user->userRole()->with('role.pages')->first();

        if (!$userRole) {
            // Assign guest role by default
            $guestRole = Role::where('name', 'guest')->first();
            if ($guestRole) {
                UserRole::create([
                    'user_id' => $user->id,
                    'role_id' => $guestRole->id,
                ]);
                $userRole = $user->userRole()->with('role.pages')->first();
            }
        }

        if (!$userRole || !$userRole->role) {
            return [
                'role_name' => 'guest',
                'allowed_customers' => [],
                'allowed_pages' => [],
            ];
        }

        $role = $userRole->role;

        return [
            'role_name' => $role->name,
            'allowed_customers' => $role->allowed_customers ?? [],
            'allowed_pages' => $role->pages->pluck('slug')->toArray(),
        ];
    }
}
