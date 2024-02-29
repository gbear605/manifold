import { ContractComment } from 'common/comment'
import { useEffect, useState } from 'react'
import { useEvent } from 'web/hooks/use-event'

import {
  getAllCommentRows,
  getComment,
  getCommentRows,
  getNewCommentRows,
  getNumContractComments,
} from 'web/lib/supabase/comments'
import { useSubscription } from 'web/lib/supabase/realtime/use-subscription'
import { maxBy } from 'lodash'
import { tsToMillis } from 'common/supabase/utils'
import { convertContractComment } from 'common/supabase/comments'
import { api } from 'web/lib/firebase/api'

export function useNumContractComments(contractId: string) {
  const [numComments, setNumComments] = useState<number>(0)

  useEffect(() => {
    if (contractId) {
      getNumContractComments(contractId).then((result) =>
        setNumComments(result)
      )
    }
  }, [contractId])

  return numComments
}

export function useCommentsOnContract(contractId: string) {
  const [comments, setComments] = useState<ContractComment[] | undefined>(
    undefined
  )
  useEffect(() => {
    api('comments', { contractId }).then((comments) => {
      setComments(comments)
    })
  }, [contractId])
  return comments
}

export function useCommentOnContract(commentId: string) {
  const [comment, setComment] = useState<ContractComment | undefined | null>(
    undefined
  )
  useEffect(() => {
    getComment(commentId).then(setComment)
  }, [commentId])
  return comment
}
// TODO: the loadNewerQuery doesn't query for comment edits (e.g. via fs_updated_time).
//This is okay for now as we're optimistically updating comments via useState.
export function useRealtimeCommentsOnContract(
  contractId: string,
  userId?: string
) {
  const { rows, dispatch } = useSubscription(
    'contract_comments',
    { k: 'contract_id', v: contractId },
    () => getCommentRows(contractId)
  )

  const loadNewer = useEvent(async () => {
    const retryLoadNewer = async (attemptNumber: number) => {
      const newRows = await getNewCommentRows(
        contractId,
        maxBy(rows ?? [], (r) => tsToMillis(r.created_time))?.created_time ??
          new Date(Date.now() - 500).toISOString(),
        userId
      )
      if (newRows?.length) {
        for (const r of newRows) {
          // really is an upsert
          dispatch({ type: 'CHANGE', change: { eventType: 'INSERT', new: r } })
        }
      } else if (attemptNumber < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attemptNumber))
      }
    }

    const maxAttempts = 10
    await retryLoadNewer(1)
  })

  return { rows: rows?.map(convertContractComment), loadNewer }
}

export function useRealtimeComments(
  limit: number
): ContractComment[] | undefined {
  const { rows } = useSubscription('contract_comments', undefined, () =>
    getAllCommentRows(limit)
  )
  return rows?.map((r) => r.data as ContractComment)
}
