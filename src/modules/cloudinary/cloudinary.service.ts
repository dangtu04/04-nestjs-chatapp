// src/cloudinary/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

export interface ImageResult {
  publicId: string;
  secureUrl: string;
}

@Injectable()
export class CloudinaryService {
  /**
   * Upload ảnh lên Cloudinary
   * @param file - File từ multer
   * @param folder - Folder trên Cloudinary (vd: "products")
   * @returns { publicId, secureUrl }
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'temps',
  ): Promise<ImageResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder, // products/
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' }, // Resize max 800x800
            { quality: 'auto' }, // Auto quality
            { fetch_format: 'auto' }, // Auto format (WebP nếu browser support)
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) return reject(error);

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
          });
        },
      );

      // Pipe file buffer vào Cloudinary stream
      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload nhiều ảnh cùng lúc
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'temps',
  ): Promise<ImageResult[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder));

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      throw error;
    }
  }
  /**
   * Xóa ảnh khỏi Cloudinary
   * @param publicId - Public ID của ảnh
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Xóa nhiều ảnh cùng lúc
   */
  async deleteMultipleImages(publicIds: string[]): Promise<void> {
    if (!publicIds || publicIds.length === 0) {
      return;
    }

    const deletePromises = publicIds.map((publicId) =>
      this.deleteImage(publicId),
    );

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      throw error;
    }
  }

  /**
   * Update ảnh (xóa ảnh cũ, upload ảnh mới)
   */
  async replaceImage(
    oldPublicId: string,
    newFile: Express.Multer.File,
    folder: string = 'temps',
  ): Promise<{ publicId: string; secureUrl: string }> {
    // Xóa ảnh cũ
    if (oldPublicId) {
      await this.deleteImage(oldPublicId);
    }

    // Upload ảnh mới
    return this.uploadImage(newFile, folder);
  }

  /**
   * Replace nhiều ảnh:
   * - Xóa các ảnh cũ không còn trong danh sách mới
   * - Giữ lại các ảnh cũ vẫn còn
   * - Upload các ảnh mới
   */
  async replaceMultipleImages(
    oldPublicIds: string[],
    newFiles: Express.Multer.File[],
    keepPublicIds: string[] = [], // Các publicId muốn giữ lại
    folder: string = 'temps',
  ): Promise<ImageResult[]> {
    // Xác định các ảnh cần xóa (ảnh cũ không nằm trong danh sách giữ lại)
    const publicIdsToDelete = oldPublicIds.filter(
      (id) => !keepPublicIds.includes(id),
    );

    // Xóa các ảnh cũ không cần thiết
    if (publicIdsToDelete.length > 0) {
      await this.deleteMultipleImages(publicIdsToDelete);
    }

    // Upload các ảnh mới
    const newUploadedImages = await this.uploadMultipleImages(newFiles, folder);

    // Kết hợp: ảnh giữ lại + ảnh mới upload
    const keptImages: ImageResult[] = keepPublicIds.map((publicId) => {
      // Tìm secureUrl từ oldPublicIds
      // Hoặc construct lại từ publicId
      const secureUrl = this.constructSecureUrl(publicId);
      return { publicId, secureUrl };
    });

    return [...keptImages, ...newUploadedImages];
  }

  /**
   * Construct secure URL từ publicId
   * Format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}
   */
  private constructSecureUrl(publicId: string): string {
    const cloudName = cloudinary.config().cloud_name;
    return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
  }
}
