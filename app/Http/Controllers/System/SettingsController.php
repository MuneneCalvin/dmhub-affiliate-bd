<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SettingsController extends Controller
{
    /** Roles that the platform relies on: they cannot be renamed or deleted. */
    private const BUILT_IN = ['super_admin', 'super-admin', 'network_owner', 'advertiser', 'publisher'];

    public function index(Request $request)
    {
        $roles = Role::query()
            ->select('id', 'name', 'created_at', 'updated_at')
            ->selectSub(DB::table('user_roles')->selectRaw('count(*)')->whereColumn('user_roles.role_id', 'roles.id'), 'users_count')
            ->with('permissions:id')
            ->orderBy('id')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'users_count' => (int) $role->users_count,
                'permissions' => $role->permissions->pluck('id')->map(fn ($id) => (int) $id)->values(),
                'built_in' => in_array($role->name, self::BUILT_IN, true),
            ]);

        return Inertia::render('system_managment/roles_page', [
            'roles' => $roles,
            'allPermissions' => Permission::select('id', 'name')->orderBy('name')->get(),
            'selectedRoleId' => $request->integer('role') ?: null,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $role = Role::create(['name' => $request->name, 'guard_name' => 'web']);

        if ($request->has('permissions') && ! empty($request->permissions)) {
            $permissions = Permission::whereIn('id', $request->permissions)->get();
            $role->syncPermissions($permissions);
        }

        return redirect()->route('system.settings.roles', ['role' => $role->id])->with('success', 'Role created successfully.');
    }

    public function show(Role $role)
    {
        $role->load('permissions');
        $allPermissions = Permission::select('id', 'name')->orderBy('name')->get();

        return response()->json([
            'role' => $role,
            'allPermissions' => $allPermissions,
        ]);
    }

    public function update(Request $request, Role $role)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        if (in_array($role->name, self::BUILT_IN, true) && $request->name !== $role->name) {
            return back()->with('error', 'Built-in roles cannot be renamed.');
        }

        $role->update(['name' => $request->name]);

        if ($request->has('permissions')) {
            $permissions = Permission::whereIn('id', $request->permissions)->get();
            $role->syncPermissions($permissions);
        }

        return redirect()->route('system.settings.roles', ['role' => $role->id])->with('success', 'Role updated successfully.');
    }

    public function destroy(Role $role)
    {
        if (in_array($role->name, self::BUILT_IN, true)) {
            return back()->with('error', 'Cannot delete a built-in role.');
        }
        $role->delete();

        return redirect()->route('system.settings.roles')->with('success', 'Role deleted successfully.');
    }

    public function rolePermissions(Role $role)
    {
        $role->load('permissions');
        $allPermissions = Permission::select('id', 'name')->orderBy('name')->get();

        return response()->json([
            'role' => $role,
            'rolePermissions' => $role->permissions->pluck('id'),
            'allPermissions' => $allPermissions,
        ]);
    }

    public function syncPermissions(Request $request, Role $role)
    {
        $validator = Validator::make($request->all(), [
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $permissions = Permission::whereIn('id', $request->permissions ?? [])->get();
        $role->syncPermissions($permissions);

        return redirect()->route('system.settings.roles', ['role' => $role->id])->with('success', 'Permissions updated successfully.');
    }

    public function permissionIndex(Request $request)
    {
        $permissions = Permission::query()->select('id', 'name')->with('roles:id,name')->orderBy('name')->get()
            ->map(fn (Permission $permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                'roles' => $permission->roles->pluck('name')->values(),
            ]);

        return Inertia::render('system_managment/permissions', [
            'permissions' => $permissions,
            'canManageRoles' => $request->user()->is_super_admin || $request->user()->permissionNames()->contains('manage_roles'),
        ]);
    }
}
