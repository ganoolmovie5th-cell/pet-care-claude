import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getVetRatingSummary,
  getVetReviews,
  type RatingSummary,
  type Review,
} from '../services/vet-dashboard';

const STARS = ['5', '4', '3', '2', '1'] as const;

export default function Reviews() {
  const { vetId } = useAuth();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vetId) return;
    Promise.all([getVetRatingSummary(vetId), getVetReviews(vetId)])
      .then(([s, r]) => {
        setSummary(s);
        setReviews(r.reviews);
      })
      .catch(() => setError('Gagal memuat review.'));
  }, [vetId]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p className="empty">Memuat…</p>;

  const total = summary.review_count || 1;

  return (
    <>
      <h1>Reviews</h1>
      <p className="subtitle">Rating dari owner yang sudah selesai booking</p>

      <div className="stat-grid">
        <div className="card">
          <p className="stat-label">Rating rata-rata</p>
          <div className="rating-hero">
            <strong>{summary.rating.toFixed(1)}</strong>
            <span className="stat-hint">dari {summary.review_count} review</span>
          </div>
        </div>

        <div className="card">
          <p className="stat-label">Distribusi</p>
          {STARS.map(s => {
            const count = summary.rating_distribution[s] ?? 0;
            return (
              <div className="dist-row" key={s}>
                <span>{s}★</span>
                <div className="bar">
                  <span style={{ width: `${(count / total) * 100}%` }} />
                </div>
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        {reviews.length === 0 ? (
          <p className="empty">Belum ada review.</p>
        ) : (
          reviews.map(r => (
            <div className="review" key={r.id}>
              <div className="review-head">
                <strong>{r.rating}★</strong>
                <span>{new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                {r.verified && <span className="badge">terverifikasi</span>}
                <span>{r.helpful_count} helpful</span>
              </div>
              {r.text && <p>{r.text}</p>}
            </div>
          ))
        )}
      </div>
    </>
  );
}
