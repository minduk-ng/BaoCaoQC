# Customer Data Restriction & Viewer Permissions Design

**Goal:** 
Restrict `viewer` access to specific `customer_name` records while ensuring `admin` maintains full access. Expand `viewer` role permissions to access the TopQC page. Add page titles across all routes.

## 1. Authentication & Role Config (`config/auth_roles.php`)
The configuration will be updated from simple email arrays to associative arrays where the key is the user's email and the value is an array of allowed `customer_name` values.

```php
'roles' => [
    'admin' => [
        'minhducqwe0123@gmail.com' => ['*'], // '*' denotes unrestricted access
    ],
    'viewer' => [
        'ngminhduc05.ds@gmail.com' => ['sg432'], // Restricted to specific customer(s)
    ],
],
```

## 2. Session Payload (`GoogleAuthController.php`)
When resolving the user's role, `GoogleAuthController` will also fetch and store the `allowed_customers` array in the session.
- Session `auth_user` will include: `role` and `allowed_customers`.

## 3. Data Filtering (`ReportController` & `TopCampaignController`)
- **Query Modification:** In the controllers, before executing `ads::whereBetween(...)`, we check the user's `allowed_customers`.
- **Logic:** 
  ```php
  $user = auth()->user() /* via session */
  if (!in_array('*', $user['allowed_customers'])) {
      $query->whereIn('customer_name', $user['allowed_customers']);
  }
  ```
- **UI Impact:** By modifying the base query for metrics, the collection of available `customerNames` sent to the frontend `FilterBar` will also be automatically restricted. Viewers will physically not be able to select or view data for customers outside their allowed list.

## 4. UI & Routing Updates
- **Routes (`web.php`):** The `/top-campaign` route middleware will be updated from `check.role:admin` to `check.role:admin,viewer`.
- **Sidebar (`Sidebar.jsx`):** Update the `menuItems` definition to include `'viewer'` in the `roles` array for the Top QC menu item.
- **Page Titles:** Inject `<Head title="..." />` (from `@inertiajs/react`) in all main page components: `Login`, `Unauthorized`, `Report/Index`, `TopCampaign/Index`, and `Compare/Index`.

## 5. Security Validation
- A user manipulating the `customer_name` query parameter via URL or API will still have the backend query strictly bounded by `whereIn('customer_name', $user['allowed_customers'])`, ensuring data isolation cannot be bypassed.
