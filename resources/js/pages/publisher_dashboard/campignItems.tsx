import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/dev/statusBadge'
import { TCampaign, TOffers } from '@/types'
import { formatCurrency } from '@/utils/utils'
import { Clock, ExternalLink, Target, TrendingUp } from 'lucide-react'

const OffersDisplay = ({ offersItems, campaign }: {
  offersItems: TOffers[];
  campaign: TCampaign;
}) => {
  return (
    <div className="space-y-4">
      {offersItems.map((offer: TOffers) => (
        <div key={offer.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-base">{offer?.name}</h4>
              <StatusBadge status={offer?.offer_status} className="mt-1" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{offer?.description}</p>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-800 dark:text-green-300">Commission</span>
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            {offer?.commission_type_1 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{offer.commission_type_1}</span>
                <span className="font-semibold text-green-700 dark:text-green-300">
                  {formatCurrency(Number(offer?.commission_value_1), campaign?.currency)}
                </span>
              </div>
            )}
            {offer?.commission_type_2 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{offer?.commission_type_2}</span>
                <span className="font-semibold text-green-700 dark:text-green-300">
                  {formatCurrency(Number(offer?.commission_value_2), campaign?.currency)}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Cookie Life</p>
                <p className="font-medium">{offer?.click_cookie_lifetime_hours}h</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-3 h-3 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Conv. Window</p>
                <p className="font-medium">{offer?.conversion_window_hours}h</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Clicks</p>
              <p className="font-semibold text-sm">{offer?.total_clicks || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conv Rate</p>
              <p className="font-semibold text-sm">{offer?.conversion_rate || 0}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">EPC</p>
              <p className="font-semibold text-sm">{formatCurrency(offer?.earnings_per_click, campaign?.currency)}</p>
            </div>
          </div>
          {offer?.preview_url && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <a href={offer?.preview_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Preview
                </a>
              </Button>
            </div>
          )}
          {offer.bonus && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md p-2">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                Bonus: {String(offer?.bonus)}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default OffersDisplay