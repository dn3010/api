// Copyright 2017-2019 @polkadot/api-derive authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import BN from 'bn.js';
import { combineLatest, Observable, of } from 'rxjs';
import { ApiInterface$Rx } from '@sylo/polkadot-api/types';
import { AccountId, Vote } from '@sylo/polkadot-types';

import { drr } from '../util/drr';

export function votes (api: ApiInterface$Rx) {
  return (referendumId: BN, accountIds: Array<AccountId> = []): Observable<Array<Vote>> => {
    return !accountIds || !accountIds.length
      ? of([]).pipe(drr())
      : combineLatest(
        accountIds.map(
          (accountId) => api.query.democracy.voteOf([referendumId, accountId]) as Observable<Vote>
        )
      ).pipe(
        drr()
      );
  };
}
