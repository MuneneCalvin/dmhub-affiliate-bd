<?php

namespace App\Http\Controllers\Pool;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Publisher;
use App\Models\Network;
use App\Models\UserNetworks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PoolController extends Controller
{
    /**
     * Pool records are either unassigned or already belong to the caller's network.
     * Super admins see all of them.
     */
    private function claimable($query)
    {
        $user = Auth::user();
        if ($user->is_super_admin) {
            return $query;
        }

        $networkId = $user->networkId();

        return $query->where(function ($q) use ($networkId) {
            $q->whereNull('network_id');
            if ($networkId !== null) {
                $q->orWhere('network_id', $networkId);
            }
        });
    }

    public function advertisers(Request $request)
    {
        $query = $this->claimable(Advertiser::query())->where('is_verified', false)
            ->with('user:id,first_name,last_name,email');

        if ($request->has('term') && $request->term) {
            $term = $request->term;
            $query->where(function ($outer) use ($term) {
                $outer->whereHas('user', function ($q) use ($term) {
                    $q->where('first_name', 'like', "%{$term}%")
                        ->orWhere('last_name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%");
                })->orWhere('business_name', 'like', "%{$term}%");
            });
        }

        $advertisers = $query->paginate(25);

        return inertia('pool/advertisers', [
            'advertisers' => $advertisers
        ]);
    }

    public function publishers(Request $request)
    {
        $query = $this->claimable(Publisher::query())->where('is_verified', false)
            ->with('user:id,first_name,last_name,email');

        if ($request->has('term') && $request->term) {
            $term = $request->term;
            $query->where(function ($outer) use ($term) {
                $outer->whereHas('user', function ($q) use ($term) {
                    $q->where('first_name', 'like', "%{$term}%")
                        ->orWhere('last_name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%");
                })->orWhere('website_url', 'like', "%{$term}%");
            });
        }

        $publishers = $query->paginate(25);
        return inertia('pool/publishers', [
            'publishers' => $publishers
        ]);
    }

    public function approveAdvertiser(Request $request, $id)
    {
        $user = Auth::user();
        // $network = Network::where('owner_email', $user->email)->first();
         $userNetwork = UserNetworks::where('user_id', $user->id)->first();
        if (!$userNetwork) {
            return redirect()->back()->with('error', 'You must be a network owner to approve publishers.');
        }
        $network = Network::find($userNetwork->network_id);
        if (!$network) {
            return back()->with('error', 'You must be a network owner to approve advertisers.');
        }
        $advertiser = $this->claimable(Advertiser::query())->findOrFail($id);
        DB::transaction(function () use ($advertiser, $network) {
            $advertiser->update([
                'network_id' => $network->id,
                'is_verified' => true,
                'verified_at' => now(),
                'status' => 'A',
            ]);
            $advertiser->user()->update([
                'status' => 'A',
            ]);
        });
        return back()->with('success', 'Advertiser approved and assigned to your network.');
    }

    public function rejectAdvertiser(Request $request, $id)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);
        $advertiser = $this->claimable(Advertiser::query())->findOrFail($id);
        $advertiser->update([
            'status' => 'R',
        ]);

        return back()->with('success', 'Advertiser rejected.');
    }

    public function approvePublisher(Request $request, $id)
    {
        $user = Auth::user();
        $userNetwork = UserNetworks::where('user_id', $user->id)->first();
        if (!$userNetwork) {
            return redirect()->back()->with('error', 'You must be a network owner to approve publishers.');
        }
        $network = Network::find($userNetwork->network_id);
        if (!$network) {
            return back()->with('error', 'You must be a network owner to approve publishers.');
        }

        $publisher = $this->claimable(Publisher::query())->findOrFail($id);
        DB::transaction(function () use ($publisher, $network) {
            $publisher->update([
                'network_id' => $network->id,
                'is_verified' => true,
                'verified_at' => now(),
            ]);
            $publisher->user()->update([
                'status' => 'A',
            ]);
        });
        return back()->with('success', 'Publisher approved and assigned to your network.');
    }

    public function rejectPublisher(Request $request, $id)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);
        $publisher = $this->claimable(Publisher::query())->findOrFail($id);
        $publisher->user()->update([
            'status' => 'R',
        ]);
        return back()->with('success', 'Publisher rejected.');
    }

    public function showAdvertiser($id)
    {
        $advertiser = $this->claimable(Advertiser::with('user'))->findOrFail($id);

        return inertia('pool/advertiser-show', [
            'advertiser' => $advertiser
        ]);
    }

    public function showPublisher($id)
    {
        $publisher = $this->claimable(Publisher::with('user'))->findOrFail($id);

        return inertia('pool/publisher-show', [
            'publisher' => $publisher
        ]);
    }
}
