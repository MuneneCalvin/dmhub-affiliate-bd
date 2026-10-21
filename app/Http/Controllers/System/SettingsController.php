<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SettingsController extends Controller
{
    public function index(Request $request)
    {
        $pageSize = $request->get('pageSize', 10);
        $page = $request->get('page', 1);

        $roles = Role::select('id', 'name', 'created_at', 'updated_at')
            ->withCount('permissions')
            ->orderBy('id', 'desc')
            ->paginate($pageSize, ['*'], 'page', $page)
            ->appends(['pageSize' => $pageSize]);

        $allPermissions = Permission::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('system_managment/roles_page', [
            'data' => [
                'results' => $roles->items(),
                'total' => $roles->total(),
                'pageCount' => $roles->lastPage(),
                'pageSize' => $roles->perPage(),
                'currentPage' => $roles->currentPage(),
                'from' => $roles->firstItem(),
                'to' => $roles->lastItem(),
            ],
            'allPermissions' => $allPermissions,
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

        return redirect()->route('system.settings.roles')->with('success', 'Role created successfully.');
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

        $builtIn = ['super_admin', 'super-admin', 'network_owner', 'advertiser', 'publisher'];
        if (in_array($role->name, $builtIn, true) && $request->name !== $role->name) {
            return back()->with('error', 'Built-in roles cannot be renamed.');
        }

        $role->update(['name' => $request->name]);

        if ($request->has('permissions')) {
            $permissions = Permission::whereIn('id', $request->permissions)->get();
            $role->syncPermissions($permissions);
        }

        return redirect()->route('system.settings.roles')->with('success', 'Role updated successfully.');
    }

    public function destroy(Role $role)
    {
        if (in_array($role->name, ['super_admin', 'super-admin', 'network_owner', 'advertiser', 'publisher'], true)) {
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

        return redirect()->route('system.settings.roles')->with('success', 'Permissions updated successfully.');
    }

    public function permissionIndex(Request $request)
    {
        $pageSize = $request->get('pageSize', 10);
        $page = $request->get('page', 1);

        $permissions = Permission::select('id', 'name', 'created_at', 'updated_at')
            ->orderBy('id', 'desc')
            ->paginate($pageSize, ['*'], 'page', $page)
            ->appends(['pageSize' => $pageSize]);

        return Inertia::render('system_managment/permissions', [
            'data' => [
                'results' => $permissions->items(),
                'total' => $permissions->total(),
                'pageCount' => $permissions->lastPage(),
                'pageSize' => $permissions->perPage(),
                'currentPage' => $permissions->currentPage(),
                'from' => $permissions->firstItem(),
                'to' => $permissions->lastItem(),
            ],
        ]);
    }
}
