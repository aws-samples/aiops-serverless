"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require("aws-sdk");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
class Utils {
    static async bucketExists(bucketName) {
        return new Promise((resolve, reject) => {
            let params = {
                Bucket: bucketName
            };
            let sdkS3 = new AWS.S3();
            sdkS3.headBucket(params, (err, _) => {
                if (err) {
                    if (err.code == 'NotFound')
                        resolve(false);
                    else
                        reject(err);
                }
                else
                    resolve(true);
            });
        });
    }
    ;
    static async checkforExistingBuckets(listOfBuckets) {
        let getListOfExistingBuckets = async function (bucketList) {
            return new Promise(async (resolve, reject) => {
                let existingBuckets = [];
                let errorList = [];
                for (let bucketName of bucketList) {
                    await Utils.bucketExists(bucketName)
                        .then((exists) => {
                        if (exists)
                            existingBuckets.push(bucketName);
                    })
                        .catch((error) => { errorList.push(error); });
                }
                if (errorList.length == 0)
                    resolve(existingBuckets);
                else
                    reject(errorList);
            });
        };
        return await getListOfExistingBuckets(listOfBuckets);
    }
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
    static hashFileOrDirectory(fileOrDir) {
        const hash = crypto.createHash('SHA256');
        hash.update(path.basename(fileOrDir)).update('\0');
        const stat = fs.statSync(fileOrDir);
        if (stat.isDirectory()) {
            for (const item of fs.readdirSync(fileOrDir).sort()) {
                hash.update(Utils.hashFileOrDirectory(path.join(fileOrDir, item)));
            }
        }
        else {
            hash.update(fs.readFileSync(fileOrDir));
        }
        return hash.digest('base64');
    }
}
exports.Utils = Utils;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBcUU7QUFDckUsaUNBQWlDO0FBQ2pDLCtCQUFnQztBQUNoQyxpQ0FBa0M7QUFDbEMseUJBQTBCO0FBQzFCLDZCQUE4QjtBQUc5QixNQUFhLEtBQUs7SUFFZCxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxVQUFrQjtRQUN4QyxPQUFPLElBQUksT0FBTyxDQUFVLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzVDLElBQUksTUFBTSxHQUFHO2dCQUNULE1BQU0sRUFBRSxVQUFVO2FBQ3JCLENBQUE7WUFDRCxJQUFJLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDaEMsSUFBSSxHQUFHLEVBQUU7b0JBQ0wsSUFBSSxHQUFHLENBQUMsSUFBSSxJQUFJLFVBQVU7d0JBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDOzt3QkFDdEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNwQjs7b0JBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBQUEsQ0FBQztJQUVGLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsYUFBdUI7UUFFeEQsSUFBSSx3QkFBd0IsR0FBRyxLQUFLLFdBQVcsVUFBb0I7WUFDL0QsT0FBTyxJQUFJLE9BQU8sQ0FBVyxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUVuRCxJQUFJLGVBQWUsR0FBYSxFQUFFLENBQUM7Z0JBQ25DLElBQUksU0FBUyxHQUFZLEVBQUUsQ0FBQztnQkFFNUIsS0FBSyxJQUFJLFVBQVUsSUFBSSxVQUFVLEVBQUU7b0JBQy9CLE1BQU0sS0FBSyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7eUJBQy9CLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO3dCQUNiLElBQUksTUFBTTs0QkFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNqRCxDQUFDLENBQUM7eUJBQ0QsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ3BEO2dCQUNELElBQUksU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDO29CQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQzs7b0JBQy9DLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzQixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQTtRQUVELE9BQU8sTUFBTSx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBR0Q7Ozs7Ozs7OztHQVNEO0lBQ0MsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFNBQWlCO1FBQ3hDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDcEMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNqRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdEU7U0FDSjthQUFNO1lBQ0gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDM0M7UUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFakMsQ0FBQztDQUNKO0FBbEVELHNCQWtFQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVC0wXG5pbXBvcnQgQVdTID0gcmVxdWlyZSgnYXdzLXNkaycpO1xuaW1wb3J0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmltcG9ydCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5cbmV4cG9ydCBjbGFzcyBVdGlscyB7XG5cbiAgICBzdGF0aWMgYXN5bmMgYnVja2V0RXhpc3RzKGJ1Y2tldE5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBCdWNrZXQ6IGJ1Y2tldE5hbWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBzZGtTMyA9IG5ldyBBV1MuUzMoKTtcbiAgICAgICAgICAgIHNka1MzLmhlYWRCdWNrZXQocGFyYW1zLCAoZXJyLCBfKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT0gJ05vdEZvdW5kJykgcmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG5cbiAgICBzdGF0aWMgYXN5bmMgY2hlY2tmb3JFeGlzdGluZ0J1Y2tldHMobGlzdE9mQnVja2V0czogc3RyaW5nW10pIHtcblxuICAgICAgICBsZXQgZ2V0TGlzdE9mRXhpc3RpbmdCdWNrZXRzID0gYXN5bmMgZnVuY3Rpb24gKGJ1Y2tldExpc3Q6IHN0cmluZ1tdKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZ1tdPihhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgICAgICBsZXQgZXhpc3RpbmdCdWNrZXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgICAgIGxldCBlcnJvckxpc3Q6IEVycm9yW10gPSBbXTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGJ1Y2tldE5hbWUgb2YgYnVja2V0TGlzdCkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBVdGlscy5idWNrZXRFeGlzdHMoYnVja2V0TmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKChleGlzdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzKSBleGlzdGluZ0J1Y2tldHMucHVzaChidWNrZXROYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7IGVycm9yTGlzdC5wdXNoKGVycm9yKSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yTGlzdC5sZW5ndGggPT0gMCkgcmVzb2x2ZShleGlzdGluZ0J1Y2tldHMpO1xuICAgICAgICAgICAgICAgIGVsc2UgcmVqZWN0KGVycm9yTGlzdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGF3YWl0IGdldExpc3RPZkV4aXN0aW5nQnVja2V0cyhsaXN0T2ZCdWNrZXRzKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICogSGFzaGVzIHRoZSBjb250ZW50cyBvZiBhIGZpbGUgb3IgZGlyZWN0b3J5LiBJZiB0aGUgYXJndW1lbnQgaXMgYSBkaXJlY3RvcnksXG4gKiBpdCBpcyBhc3N1bWVkIG5vdCB0byBjb250YWluIHN5bWxpbmtzIHRoYXQgd291bGQgcmVzdWx0IGluIGEgY3ljbGljIHRyZWUuXG4gKlxuICogQHBhcmFtIGZpbGVPckRpciB0aGUgcGF0aCB0byB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCBzaG91bGQgYmUgaGFzaGVkLlxuICpcbiAqIEByZXR1cm5zIGEgU0hBMjU2IGhhc2gsIGJhc2UtNjQgZW5jb2RlZC5cbiAqIFxuICogc291cmNlOiBodHRwczovL2dpdGh1Yi5jb20vYXdzbGFicy9hd3MtZGVsaXZsaWIvYmxvYi9tYXN0ZXIvbGliL3V0aWwudHNcbiAqL1xuICAgIHN0YXRpYyBoYXNoRmlsZU9yRGlyZWN0b3J5KGZpbGVPckRpcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdTSEEyNTYnKTtcbiAgICAgICAgaGFzaC51cGRhdGUocGF0aC5iYXNlbmFtZShmaWxlT3JEaXIpKS51cGRhdGUoJ1xcMCcpO1xuICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZmlsZU9yRGlyKTtcbiAgICAgICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGZzLnJlYWRkaXJTeW5jKGZpbGVPckRpcikuc29ydCgpKSB7XG4gICAgICAgICAgICAgICAgaGFzaC51cGRhdGUoVXRpbHMuaGFzaEZpbGVPckRpcmVjdG9yeShwYXRoLmpvaW4oZmlsZU9yRGlyLCBpdGVtKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGFzaC51cGRhdGUoZnMucmVhZEZpbGVTeW5jKGZpbGVPckRpcikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBoYXNoLmRpZ2VzdCgnYmFzZTY0Jyk7XG5cbiAgICB9XG59Il19