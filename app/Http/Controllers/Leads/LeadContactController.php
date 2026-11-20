<?php

namespace App\Http\Controllers\Leads;

use App\Exports\LeadContactsExport;
use App\Http\Controllers\Controller;
use App\Models\LeadContact;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class LeadContactController extends Controller
{
    public function index(Request $request)
    {
        $status = in_array($request->query('status'), LeadContact::STATUSES, true) ? $request->query('status') : null;
        $search = trim((string) $request->query('search', ''));
        $visible = LeadContact::visibleTo($request->user());

        // Tile counts cover everything the viewer may see, ignoring the active filter.
        $perStatus = (clone $visible)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $statusCounts = ['all' => (int) $perStatus->sum()];
        foreach (LeadContact::STATUSES as $name) {
            $statusCounts[$name] = (int) ($perStatus[$name] ?? 0);
        }

        $leads = $visible->with(['campaign:id,name', 'offer:id,name'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.addcslashes($search, '\\%_').'%';
                $query->where(fn ($q) => $q->where('email', 'like', $like)->orWhere('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)->orWhere('company', 'like', $like));
            })
            ->orderByDesc('id')->paginate(25)->withQueryString();

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'status' => $status ?? 'all',
            'statusCounts' => $statusCounts,
        ]);
    }

    public function update(Request $request, int $lead)
    {
        $contact = LeadContact::visibleTo($request->user())->findOrFail($lead);
        $data = $request->validate([
            'status' => ['sometimes', 'required', Rule::in(LeadContact::STATUSES)],
            'notes' => 'sometimes|nullable|string|max:5000',
        ]);
        $contact->update($data);

        return back()->with('success', __('Lead updated.'));
    }

    /** Erase the contact only: the confirmed submission and its commission stay in the ledger. */
    public function destroy(Request $request, int $lead)
    {
        LeadContact::visibleTo($request->user())->findOrFail($lead)->delete();

        return back()->with('success', __('Lead deleted.'));
    }

    public function export(Request $request)
    {
        $status = $request->query('status');

        return Excel::download(
            new LeadContactsExport($request->user(), in_array($status, LeadContact::STATUSES, true) ? $status : null),
            'leads.xlsx', \Maatwebsite\Excel\Excel::XLSX, ['Cache-Control' => 'private, no-store'],
        );
    }
}
