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
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));

        $leads = LeadContact::visibleTo($request->user())->with(['campaign:id,name', 'offer:id,name'])
            ->when(in_array($status, LeadContact::STATUSES, true), fn ($query) => $query->where('status', $status))
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.addcslashes($search, '\\%_').'%';
                $query->where(fn ($q) => $q->where('email', 'like', $like)->orWhere('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)->orWhere('company', 'like', $like));
            })
            ->orderByDesc('id')->paginate(25)->withQueryString();

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'filters' => ['status' => $status, 'search' => $search],
            'statuses' => LeadContact::STATUSES,
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
