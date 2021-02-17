import { saveAs } from 'file-saver';
import { Host, Cluster, Presigned, Inventory, ClusterStatusEnum, HostRole } from '../../api/types';
import { HOST_ROLES, TIME_ZERO } from '../../config';
import {
  getHostLogsDownloadUrl,
  ocmClient,
  handleApiError,
  getErrorMessage,
  getPresignedFileUrl,
} from '../../api';
import { AlertsContextType } from '../AlertsContextProvider';
import { DASH } from '../constants';

export const canEnable = (clusterStatus: ClusterStatusEnum, status: Host['status']) =>
  [
    ClusterStatusEnum.PENDING_FOR_INPUT,
    ClusterStatusEnum.INSUFFICIENT,
    ClusterStatusEnum.READY,
    ClusterStatusEnum.ADDING_HOSTS,
  ].includes(clusterStatus) && ['disabled'].includes(status);

export const canDisable = (clusterStatus: ClusterStatusEnum, status: Host['status']) =>
  [
    ClusterStatusEnum.PENDING_FOR_INPUT,
    ClusterStatusEnum.INSUFFICIENT,
    ClusterStatusEnum.READY,
    ClusterStatusEnum.ADDING_HOSTS,
  ].includes(clusterStatus) &&
  ['discovering', 'disconnected', 'known', 'insufficient', 'pending-for-input'].includes(status);

export const canDelete = (clusterStatus: ClusterStatusEnum, status: Host['status']) =>
  [
    ClusterStatusEnum.PENDING_FOR_INPUT,
    ClusterStatusEnum.INSUFFICIENT,
    ClusterStatusEnum.READY,
    ClusterStatusEnum.ADDING_HOSTS,
  ].includes(clusterStatus) &&
  [
    'discovering',
    'known',
    'disconnected',
    'disabled',
    'insufficient',
    'resetting',
    'resetting-pending-user-input',
    'resetting-pending-user-action',
    'installing-pending-user-action',
    'pending-for-input',
    'added-to-existing-cluster',
  ].includes(status);

export const canReset = (clusterStatus: ClusterStatusEnum, status: Host['status']) =>
  [ClusterStatusEnum.ADDING_HOSTS].includes(clusterStatus) &&
  ['error', 'installing-pending-user-action'].includes(status);

export const canEditRole = (clusterStatus: ClusterStatusEnum, status: Host['status']) =>
  [
    ClusterStatusEnum.PENDING_FOR_INPUT,
    ClusterStatusEnum.INSUFFICIENT,
    ClusterStatusEnum.READY,
  ].includes(clusterStatus) &&
  [
    'discovering',
    'known',
    'disconnected',
    'disabled',
    'insufficient',
    'pending-for-input',
  ].includes(status);

export const canEditHost = canEditRole;

export const canEditDisks = canEditRole;

export const canDownloadKubeconfig = (clusterStatus: ClusterStatusEnum) =>
  [
    ClusterStatusEnum.INSTALLING,
    ClusterStatusEnum.FINALIZING,
    ClusterStatusEnum.ERROR,
    ClusterStatusEnum.CANCELLED,
    ClusterStatusEnum.INSTALLED,
  ].includes(clusterStatus);

export const canInstallHost = (cluster: Cluster, hostStatus: Host['status']) =>
  cluster.kind === 'AddHostsCluster' &&
  cluster.status === ClusterStatusEnum.ADDING_HOSTS &&
  hostStatus === 'known';

export const getHostProgressStages = (host: Host) =>
  host.progressStages || [
    'Starting installation',
    'Installing',
    'Writing image to disk',
    'Rebooting',
    'Configuring',
    'Joined',
    'Done',
  ];

export const getHostProgress = (host: Host) =>
  host.progress || { currentStage: 'Preparing installation', progressInfo: undefined };

export const getHostProgressStageNumber = (host: Host) => {
  const stages = getHostProgressStages(host);
  const progress = getHostProgress(host);
  if (progress) {
    const currentStage = progress.currentStage;
    return stages.findIndex((s) => currentStage.match(s)) + 1;
  }
  return 0;
};

export const canHostnameBeChanged = (hostStatus: Host['status']) =>
  ['discovering', 'known', 'disconnected', 'insufficient', 'pending-for-input'].includes(
    hostStatus,
  );

export const getHostRole = (host: Host): string =>
  `${HOST_ROLES.find((role) => role.value === host.role)?.label || HOST_ROLES[0].label}${
    host.bootstrap ? ' (bootstrap)' : ''
  }`;

export const canDownloadHostLogs = (host: Host) =>
  !!host.logsCollectedAt && host.logsCollectedAt != TIME_ZERO;

export const canDownloadClusterLogs = (cluster: Cluster) =>
  !!(cluster.hosts || []).find((host) => canDownloadHostLogs(host));

export const downloadHostInstallationLogs = async (
  addAlert: AlertsContextType['addAlert'],
  host: Host,
) => {
  if (ocmClient) {
    try {
      const { data } = await getPresignedFileUrl({
        clusterId: host.clusterId || 'UNKNOWN_CLUSTER',
        fileName: 'logs',
        hostId: host.id,
        logsType: 'host',
      });
      saveAs(data.url);
    } catch (e) {
      handleApiError<Presigned>(e, async (e) => {
        addAlert({ title: 'Could not download host logs.', message: getErrorMessage(e) });
      });
    }
  } else {
    saveAs(getHostLogsDownloadUrl(host.id, host.clusterId));
  }
};

export const hasKnownHost = (cluster: Cluster) =>
  !!cluster.hosts?.find((host) => host.status === 'known');

export const getHostname = (host: Host, inventory: Inventory) =>
  host.requestedHostname || inventory.hostname;

export const getHardwareTypeText = (inventory: Inventory) => {
  let hardwareTypeText = DASH;
  const { systemVendor } = inventory;

  if (systemVendor !== undefined) {
    if (systemVendor.virtual) {
      hardwareTypeText = 'Virtual machine';
    } else {
      hardwareTypeText = 'Bare metal';
    }
  }

  return hardwareTypeText;
};
const getHostRoleCount = (hosts: Host[], role: HostRole) =>
  hosts.filter((host) => host.role === role).length;

export const getMasterCount = (hosts: Host[]) => getHostRoleCount(hosts, 'master');

export const getWorkerCount = (hosts: Host[]) => getHostRoleCount(hosts, 'worker');
