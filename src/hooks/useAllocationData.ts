import { useEffect, useState } from 'react';
import { SavingsTarget } from '@/types/transaction.types';

export function useAllocationData(targetId?: string) {
  const [data, setData] = useState<{ allocations: any[] }>({ allocations: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!targetId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/savings/${targetId}/allocations`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching allocations:', error);
        setError('Failed to fetch allocations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [targetId]);

  return { data, isLoading, error };
}
