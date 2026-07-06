<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
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
     * Determine role from config and store user info in session.
     */
    public function handleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect('/login')->with('error', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        }

        $email = $googleUser->getEmail();
        $role = $this->resolveRole($email);

        Session::put('auth_user', [
            'name' => $googleUser->getName(),
            'email' => $email,
            'avatar' => $googleUser->getAvatar(),
            'role' => $role,
        ]);

        if ($role === 'guest') {
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
     * Look up the user's email in config/auth_roles.php to determine their role.
     * Returns 'guest' if the email is not found in any role list.
     */
    private function resolveRole(string $email): string
    {
        $roles = config('auth_roles.roles', []);

        foreach ($roles as $roleName => $emails) {
            if (in_array($email, $emails, true)) {
                return $roleName;
            }
        }

        return 'guest';
    }
}
