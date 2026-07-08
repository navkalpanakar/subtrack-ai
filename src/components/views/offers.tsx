"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Tag, Search, ExternalLink, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useSubscriptions, fetchOffers, type Offer } from "@/hooks/use-subscriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function OffersView() {
  const { data: subs } = useSubscriptions();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [searchedProvider, setSearchedProvider] = useState("");

  const providers = useMemo(() => {
    if (!subs) return [];
    const set = new Map<string, string>();
    for (const s of subs) set.set(s.provider, s.name);
    return [...set.entries()].map(([provider, name]) => ({ provider, name }));
  }, [subs]);

  const runSearch = async (provider: string) => {
    setSearchedProvider(provider);
    setLoading(true);
    setOffers(null);
    try {
      const { offers } = await fetchOffers(provider);
      setOffers(offers);
      if (offers.length === 0) toast.info("No live offers found right now.");
    } catch {
      toast.error("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSearch = () => {
    if (query.trim()) runSearch(query.trim());
  };

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Live Offers
        </h1>
        <p className="text-xs text-muted-foreground">
          Real-time deals &amp; discounts from your providers
        </p>
      </div>

      {/* Search box */}
      <div className="glass rounded-2xl p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
              placeholder="Search any provider…"
              className="pl-9 bg-background"
            />
          </div>
          <Button onClick={handleCustomSearch} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {providers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {providers.slice(0, 8).map((p) => (
              <button
                key={p.provider}
                onClick={() => {
                  setQuery(p.provider);
                  runSearch(p.provider);
                }}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  searchedProvider === p.provider
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                {p.provider}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && offers && offers.length === 0 && (
        <div className="text-center py-12">
          <Tag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No live offers found for {searchedProvider}.
          </p>
        </div>
      )}

      {!loading && offers && offers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {offers.length} live result{offers.length !== 1 ? "s" : ""} for{" "}
            <span className="font-medium text-foreground">{searchedProvider}</span>
          </div>
          {offers.map((offer, i) => (
            <motion.a
              key={i}
              href={offer.url}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-4 block active:scale-[0.99] transition group"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition">
                    {offer.title}
                  </h3>
                  {offer.detail && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {offer.detail}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new URL(offer.url).hostname.replace("www.", "")}
                    </span>
                    {offer.validUntil && (
                      <span className="text-[10px] text-muted-foreground">· {offer.validUntil}</span>
                    )}
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}

      {!loading && !offers && (
        <div className="text-center py-12">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Tag className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm font-medium">Find deals &amp; discounts</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Tap a provider above or search any service to see live offers from
            across the web.
          </p>
        </div>
      )}
    </div>
  );
}
