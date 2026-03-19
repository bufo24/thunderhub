import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type GetTapFederationServersQueryVariables = { [key: string]: never };

export type GetTapFederationServersQuery = {
  __typename?: 'Query';
  getTapFederationServers: {
    __typename?: 'TapFederationServerList';
    servers: {
      __typename?: 'TapFederationServer';
      host: string;
      id?: number | null;
    }[];
  };
};

export const GetTapFederationServersDocument = gql`
  query GetTapFederationServers {
    getTapFederationServers {
      servers {
        host
        id
      }
    }
  }
`;

export function useGetTapFederationServersQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetTapFederationServersQuery,
    GetTapFederationServersQueryVariables
  >
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetTapFederationServersQuery,
    GetTapFederationServersQueryVariables
  >(GetTapFederationServersDocument, options);
}
