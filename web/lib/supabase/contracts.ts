import { CPMMContract, visibility, Contract } from 'common/contract'
import {
  millisToTs,
  run,
  selectJson,
  SupabaseClient,
} from 'common/supabase/utils'
import { filterDefined } from 'common/util/array'
import { adminDb, db } from './db'
import { filter, Sort } from 'web/components/contract-search'
import { stateType } from 'web/components/supabase-search'
import {
  inMemoryStore,
  usePersistentState,
} from 'web/hooks/use-persistent-state'
import { ShowTime } from 'web/components/contract/contract-details'

export async function getContractIds(contractIds: string[]) {
  const { data } = await run(
    db.from('contracts').select('data').in('id', contractIds)
  )
  if (data && data.length > 0) {
    return data.map((d) => d.data as Contract)
  } else {
    return []
  }
}

export const getContract = async (id: string) => {
  const { data } = await run(db.from('contracts').select('data').eq('id', id))
  return data && data.length > 0 ? (data[0].data as Contract) : null
}

export const getContracts = async (options: {
  limit: number
  beforeTime?: number
  order?: 'asc' | 'desc'
}) => {
  let q = selectJson(db, 'contracts')
  q = q.order('created_time', {
    ascending: options?.order === 'asc',
  } as any)
  if (options.beforeTime) {
    q = q.lt('created_time', millisToTs(options.beforeTime))
  }
  q = q.limit(options.limit)
  const { data } = await run(q)
  return data.map((r) => r.data)
}

export async function getYourRecentContracts(
  db: SupabaseClient,
  userId: string,
  count: number
) {
  const { data } = await db.rpc('get_your_recent_contracts', {
    uid: userId,
    n: count,
    start: 0,
  })

  if (!data) return null

  const contracts = filterDefined(data.map((d) => (d as any).data))
  return contracts
}

export async function getYourDailyChangedContracts(
  db: SupabaseClient,
  userId: string,
  count: number
) {
  const { data } = await db.rpc('get_your_daily_changed_contracts', {
    uid: userId,
    n: count,
    start: 0,
  })

  if (!data) return null

  const contracts = filterDefined(
    data.map((d) => (d as any).data)
  ) as CPMMContract[]
  return contracts
}

export async function getYourTrendingContracts(
  db: SupabaseClient,
  userId: string,
  count: number
) {
  const { data } = await db.rpc('get_your_trending_contracts', {
    uid: userId,
    n: count,
    start: 0,
  })

  return data?.map((d) => (d as any).data as Contract)
}

export async function getContractFromSlug(
  contractSlug: string,
  permission?: 'admin'
) {
  const client = permission == 'admin' ? adminDb : db
  const { data: contract } = await run(
    client.from('contracts').select('data').eq('slug', contractSlug)
  )
  if (contract && contract.length > 0) {
    return (contract[0] as unknown as { data: Contract }).data
  }
  return undefined
}

export async function getContractVisibilityFromSlug(contractSlug: string) {
  const { data: contractVisibility } = await run(
    db.from('contracts').select('visibility').eq('slug', contractSlug)
  )

  if (contractVisibility && contractVisibility.length > 0) {
    return (contractVisibility[0] as unknown as { visibility: visibility })
      .visibility
  }
  return undefined
}

export async function searchContract(props: {
  state: stateType
  query: string
  filter: filter
  sort: Sort
  offset: number
  limit: number
  group_id?: string
  creator_id?: string
}) {
  const { state, query, filter, sort, offset, limit, group_id, creator_id } =
    props

  if (!query || query.length == 0) {
    const { data, error } = await db.rpc('empty_search_contracts', {
      contract_filter: filter,
      contract_sort: sort,
      offset_n: offset,
      limit_n: limit,
      group_id: group_id,
      creator_id: creator_id,
    })
    if (data && data.length > 0) {
      return {
        fuzzyOffset: 0,
        data: data.map((d) => (d as any).data) as Contract[],
      }
    }
  }
  if (state.fuzzyContractOffset > 0) {
    console.log('fuzzy')
    return searchContractFuzzy({
      state,
      query,
      filter,
      sort,
      limit,
      group_id,
      creator_id,
    })
  }
  console.log('regular')
  const { data, error } = await db.rpc('search_contracts', {
    term: query,
    contract_filter: filter,
    contract_sort: sort,
    offset_n: offset,
    limit_n: limit,
    fuzzy: true,
    group_id: group_id,
    creator_id: creator_id,
  })

  if (data) {
    console.log('textlength', data.length)
    const textData = data.map((d) => (d as any).data) as Contract[]
    if (data.length == 20) {
      return { fuzzyOffset: 0, data: textData }
    } else {
      const fuzzyData = await searchContractFuzzy({
        state,
        query,
        filter,
        sort,
        limit: limit - data.length,
        group_id,
        creator_id,
      })
      return {
        // fuzzyOffset: fuzzyData.fuzzyOffset,
        fuzzyOffset: 0,
        data: textData.concat(fuzzyData.data),
      }
    }
  }
  return { fuzzyOffset: 0, data: [] }
}

export async function searchContractFuzzy(props: {
  state: stateType
  query: string
  filter: filter
  sort: Sort
  limit: number
  group_id?: string
  creator_id?: string
}) {
  const { state, query, filter, sort, limit, group_id, creator_id } = props
  const { data, error } = await db.rpc('search_contracts', {
    term: query,
    contract_filter: filter,
    contract_sort: sort,
    offset_n: state.fuzzyContractOffset,
    limit_n: limit,
    fuzzy: true,
    group_id: group_id,
    creator_id: creator_id,
  })
  console.log('fuzzyPartition', state.fuzzyContractOffset, '\nlimit', limit)
  if (data && data.length > 0) {
    console.log(
      'fuzzyData',
      data.length,
      '\nfuzzyOffset',
      state.fuzzyContractOffset
    )
    return {
      // fuzzyOffset: state.fuzzyContractOffset + data.length,
      fuzzyOffset: 0,
      data: data.map((d) => (d as any).data) as Contract[],
    }
  }
  return { fuzzyOffset: 0, data: [] }
}
