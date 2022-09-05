export declare class Utils {
    static bucketExists(bucketName: string): Promise<boolean>;
    static checkforExistingBuckets(listOfBuckets: string[]): Promise<string[]>;
    /**
 * Hashes the contents of a file or directory. If the argument is a directory,
 * it is assumed not to contain symlinks that would result in a cyclic tree.
 *
 * @param fileOrDir the path to the file or directory that should be hashed.
 *
 * @returns a SHA256 hash, base-64 encoded.
 *
 * source: https://github.com/awslabs/aws-delivlib/blob/master/lib/util.ts
 */
    static hashFileOrDirectory(fileOrDir: string): string;
}
