<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPageAccess
{
    /**
     * Route name prefix → page slug mapping.
     */
    private const ROUTE_PAGE_MAP = [
        'report.' => 'report',
        'top.' => 'top-campaign',
        'compare.' => 'compare',
        'admin.' => 'admin-panel',
    ];

    /**
     * Refresh permissions from DB and check if the user can access the current page.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $sessionUser = $request->session()->get('auth_user');
        if (!$sessionUser || !isset($sessionUser['user_id'])) {
            return redirect('/unauthorized');
        }

        // Refresh permissions from DB on every request
        $user = User::with('userRole.role.pages')->find($sessionUser['user_id']);
        if (!$user || !$user->userRole || !$user->userRole->role) {
            $request->session()->forget('auth_user');
            return redirect('/login');
        }

        $role = $user->userRole->role;
        $allowedPages = $role->pages->pluck('slug')->toArray();
        $allowedCustomers = $role->allowed_customers ?? [];

        // Update session with fresh DB data
        $request->session()->put('auth_user', array_merge($sessionUser, [
            'role' => $role->name,
            'allowed_customers' => $allowedCustomers,
            'allowed_pages' => $allowedPages,
        ]));

        // Check page access
        $routeName = $request->route()?->getName() ?? '';
        $pageSlug = $this->routeToPageSlug($routeName);

        if ($pageSlug && !in_array($pageSlug, $allowedPages)) {
            return redirect('/unauthorized');
        }

        return $next($request);
    }

    /**
     * Map a Laravel route name to a page slug.
     */
    private function routeToPageSlug(string $routeName): ?string
    {
        foreach (self::ROUTE_PAGE_MAP as $prefix => $slug) {
            if (str_starts_with($routeName, $prefix)) {
                return $slug;
            }
        }
        return null;
    }
}
