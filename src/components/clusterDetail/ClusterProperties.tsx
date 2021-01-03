import React from 'react';
import { GridItem, Grid } from '@patternfly/react-core';
import { Cluster } from '../../api/types';
import { DetailList, DetailItem } from '../ui/DetailList';
import { stringToJSON } from '../../api';

type ClusterPropertiesProps = {
  cluster: Cluster;
};

const ClusterProperties: React.FC<ClusterPropertiesProps> = ({ cluster }) => {
  cluster = cluster.openshiftVersion
    ? cluster
    : (stringToJSON<Cluster>(JSON.stringify(cluster)) as Cluster);

  return (
    <Grid>
      <GridItem md={6}>
        <DetailList>
          <DetailItem title="OpenShift version" value={cluster.openshiftVersion} />
          <DetailItem title="Base DNS domain" value={cluster.baseDnsDomain} />
          <DetailItem title="API virtual IP" value={cluster.apiVip} />
          <DetailItem title="Ingress virtual IP" value={cluster.ingressVip} />
        </DetailList>
      </GridItem>
      <GridItem md={6}>
        <DetailList>
          <DetailItem title="UUID" value={cluster.id} />
          <DetailItem title="Cluster network CIDR" value={cluster.clusterNetworkCidr} />
          <DetailItem
            title="Cluster network host prefix"
            value={cluster.clusterNetworkHostPrefix}
          />
          <DetailItem title="Service network CIDR" value={cluster.serviceNetworkCidr} />
        </DetailList>
      </GridItem>
    </Grid>
  );
};

export default ClusterProperties;
