<?php

namespace App\Http\Controllers\Network;

use App\Http\Controllers\Controller;
use App\Models\Network;
use App\Models\UserNetworks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class NetworkSettingsController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $userNetwork = UserNetworks::where('user_id', $user->id)->first();

        if (! $userNetwork) {
            return redirect()->back()->with('error', 'No network found for this user.');
        }

        $network = Network::find($userNetwork->network_id);

        if (! $network) {
            return redirect()->back()->with('error', 'Network not found.');
        }

        return Inertia::render('network_settings/index', [
            'network' => [
                'id' => $network->id,
                'network_name' => $network->network_name,
                'logo_url' => $network->logo_url,
                'sidebar_logo_url' => $network->sidebar_logo_url,
                'favicon_url' => $network->favicon_url,
                'support_email' => $network->support_email,
                'support_phone' => $network->support_phone,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        $userNetwork = UserNetworks::where('user_id', $user->id)->first();
        if (! $userNetwork) {
            return redirect()->back()->with('error', 'No network found for this user.');
        }
        $network = Network::find($userNetwork->network_id);
        if (! $network) {
            return redirect()->back()->with('error', 'Network not found.');
        }

        $validated = $request->validate([
            'network_name' => 'required|string|max:100',
            'logo' => 'nullable|array',
            'logo.*' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'sidebar_logo' => 'nullable|array',
            'sidebar_logo.*' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'favicon' => 'nullable|array',
            'favicon.*' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,ico|max:1024',
            'support_email' => 'nullable|email|max:255',
            'support_phone' => 'nullable|string|max:15',
        ]);

        $network->network_name = $validated['network_name'];
        $network->support_email = $validated['support_email'] ?? $network->support_email;
        $network->support_phone = $validated['support_phone'] ?? $network->support_phone;
        $logoFiles = $request->file('logo');
        if ($logoFiles && count($logoFiles) > 0) {
            if ($network->logo_url) {
                $oldPath = str_replace('/storage/', '', $network->logo_url);
                Storage::disk('public')->delete($oldPath);
            }

            $logoPath = $logoFiles[0]->store('network_logos', 'public');
            $network->logo_url = '/storage/'.$logoPath;
        }
        $sidebarLogoFiles = $request->file('sidebar_logo');
        if ($sidebarLogoFiles && count($sidebarLogoFiles) > 0) {
            if ($network->sidebar_logo_url) {
                $oldPath = str_replace('/storage/', '', $network->sidebar_logo_url);
                Storage::disk('public')->delete($oldPath);
            }

            $sidebarLogoPath = $sidebarLogoFiles[0]->store('network_logos', 'public');
            $network->sidebar_logo_url = '/storage/'.$sidebarLogoPath;
        }
        $faviconFiles = $request->file('favicon');
        if ($faviconFiles && count($faviconFiles) > 0) {
            if ($network->favicon_url) {
                $oldPath = str_replace('/storage/', '', $network->favicon_url);
                Storage::disk('public')->delete($oldPath);
            }

            $faviconPath = $faviconFiles[0]->store('network_logos', 'public');
            $network->favicon_url = '/storage/'.$faviconPath;
        }

        $network->save();

        return redirect()->back()->with('success', 'Network settings updated successfully.');
    }
}
