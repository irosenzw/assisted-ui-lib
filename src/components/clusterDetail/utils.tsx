import { saveAs } from 'file-saver';
import { get } from 'lodash';
import {
  ocmClient,
  getPresignedFileUrl,
  handleApiError,
  getErrorMessage,
  getClusterLogsDownloadUrl,
  stringToJSON,
} from '../../api';
import { Cluster, Host, Presigned } from '../../api/types';
import { AlertsContextType } from '../AlertsContextProvider';
import { getMasterCount, getWorkerCount } from '../hosts/utils';

export const getCamelCasedClusterObject = (cluster: Cluster): Cluster => {
  if (cluster.statusInfo) {
    return cluster;
  }

  return stringToJSON<Cluster>(JSON.stringify(cluster)) as Cluster;
};

export const downloadClusterInstallationLogs = async (
  addAlert: AlertsContextType['addAlert'],
  clusterId: string,
) => {
  if (ocmClient) {
    try {
      const { data } = await getPresignedFileUrl({
        clusterId,
        fileName: 'logs',
        hostId: undefined,
        logsType: 'all',
      });
      saveAs(data.url);
    } catch (e) {
      handleApiError<Presigned>(e, async (e) => {
        addAlert({
          title: 'Could not download cluster installation logs.',
          message: getErrorMessage(e),
        });
      });
    }
  } else {
    saveAs(getClusterLogsDownloadUrl(clusterId));
  }
};

const getClusterResources = (cluster: Cluster, resoucePath: string): number => {
  if (!cluster.hosts) {
    return 0;
  }

  const masterCount = getMasterCount(cluster.hosts);
  const workerCount = getWorkerCount(cluster.hosts);

  // Cluster contain only master hosts
  const countMastersOnly = masterCount >= 3 && workerCount === 0;

  // Cluster contain master and worker hosts
  const countWorkersOnly = masterCount >= 3 && workerCount >= 2;

  const result = cluster.hosts.reduce((acc, host: Host) => {
    if (!host.inventory) {
      return acc;
    }
    if (
      (host.role === 'worker' && countWorkersOnly) ||
      (host.role === 'master' && countMastersOnly)
    ) {
      const hostInventory = JSON.parse(host.inventory as string);
      return (acc += get(hostInventory, resoucePath));
    }
  }, 0);

  return result;
};

export const getClustervCPUCount = (cluster: Cluster): number =>
  getClusterResources(cluster, 'cpu.count');

export const getClusterMemoryAmount = (cluster: Cluster): number =>
  getClusterResources(cluster, 'memory.physical_bytes');
