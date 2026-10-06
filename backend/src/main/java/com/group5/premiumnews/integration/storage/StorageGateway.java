package com.group5.premiumnews.integration.storage;

import java.io.InputStream;

public interface StorageGateway {

    StoredObject upload(UploadRequest request, InputStream content);

    void delete(String objectKey);

    record UploadRequest(String ownerType, Long ownerId, String fileName, String contentType, long contentLength) {
    }

    record StoredObject(String objectKey, String mediaUrl, String checksumSha256) {
    }
}
