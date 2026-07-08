<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $authUser = $request->session()->get('auth_user');

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $authUser ? [
                    'user_id' => $authUser['user_id'] ?? null,
                    'name' => $authUser['name'] ?? null,
                    'email' => $authUser['email'] ?? null,
                    'avatar' => $authUser['avatar'] ?? null,
                    'role' => $authUser['role'] ?? null,
                    'allowed_pages' => $authUser['allowed_pages'] ?? [],
                ] : null,
            ],
        ];
    }
}
