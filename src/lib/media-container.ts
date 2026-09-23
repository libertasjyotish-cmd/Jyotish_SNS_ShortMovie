/** A container the platform will never finish; the video has to be handed over again. */
export class ContainerFailedError extends Error {}

/** The platform is still transcoding; the post goes live on a later run, nothing is lost. */
export class PendingTranscodeError extends Error {}
