import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
    Plugins, CameraResultType, Capacitor, FilesystemDirectory,
    CameraPhoto, CameraSource
} from '@capacitor/core';
import { Photo } from '../model/photo';

const { Camera, Filesystem, Storage } = Plugins;

@Injectable({
    providedIn: 'root'
})
export class PhotoService {

    public photos: Photo[] = [];
    private PHOTO_STORAGE: string = "photos";
    private platform: Platform;

    constructor(platform: Platform) {
        this.platform = platform;
    }

    public async addNewToGallery() {
        // Take a photo
        const capturedPhoto = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100
        });

        // Se almacena la foto en el almacenamiento del dispositivo y el objeto retornado se almacena a la galeria de la aplicación.
        const savedImageFile: any = await this.savePicture(capturedPhoto);
        this.photos.unshift(savedImageFile);

        /* Mediate la Storage API, se permite almacenar de forma permanente una foto y recuperarla al abrir nuevamente
           la galeria de imagenes. */
        Storage.set({
            key: this.PHOTO_STORAGE,
            value: this.platform.is('hybrid') ? JSON.stringify(this.photos) 
                    : JSON.stringify(this.photos.map(p => {
                        // Don't save the base64 representation of the photo data, 
                        // since it's already saved on the Filesystem
                        const photoCopy = { ...p };
                        delete photoCopy.base64;

                        return photoCopy;
                    }))
        });
    }

    private async savePicture(cameraPhoto: CameraPhoto) {
        // Convert photo to base64 format, required by Filesystem API to save
        const base64Data = await this.readAsBase64(cameraPhoto);

        // Write the file to the data directory
        const fileName = new Date().getTime() + '.jpeg';
        await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: FilesystemDirectory.Data
        });

        // Get platform-specific photo filepaths
        return await this.getPhotoFile(cameraPhoto, fileName);
    }

    /**
     * Convert photo to base64 format
     * 
     * @param cameraPhoto Photo
     */
    private async readAsBase64(cameraPhoto: CameraPhoto) {
        // "hybrid" will detect Cordova or Capacitor
        if (this.platform.is('hybrid')) {
            // Read the file into base64 format
            const file = await Filesystem.readFile({
                path: cameraPhoto.path
            });

            return file.data;
        }
        else {
            // Fetch the photo, read as a blob, then convert to base64 format
            const response = await fetch(cameraPhoto.webPath);
            const blob = await response.blob();

            return await this.convertBlobToBase64(blob) as string;  
        }
    }

    convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
        const reader = new FileReader;
        reader.onerror = reject;
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.readAsDataURL(blob);
    });

    private async getPhotoFile(cameraPhoto, fileName) {
        if (this.platform.is('hybrid')) {
            // Get the new, complete filepath of the photo saved on filesystem
            const fileUri = await Filesystem.getUri({
                directory: FilesystemDirectory.Data,
                path: fileName
            });

            // Display the new image by rewriting the 'file://' path to HTTP
            // Details: https://ionicframework.com/docs/building/webview#file-protocol
            return {
                filePath: fileUri.uri,
                webViewPath: Capacitor.convertFileSrc(fileUri.uri),
            };
        }
        else {
            // Use webPath to display the new image instead of base64 since it's 
            // already loaded into memory
            return {
                filePath: fileName,
                webViewPath: cameraPhoto.webPath
            };
        }
    }

    /**
     * Carga las fotos almacenadas, en caso de que no exista ninguna, retorna
     * un arreglo de fotos vacio.
     * 
     */
    public async loadSaved() {
        // Retrieve cached photo array data
        const photos = await Storage.get({ key: this.PHOTO_STORAGE });
        this.photos = JSON.parse(photos.value) || [];

        // Easiest way to detect when running on the web: 
        // “when the platform is NOT hybrid, do this”
        if (!this.platform.is('hybrid')) {
            // Display the photo by reading into base64 format
            for (let photo of this.photos) {
            // Read each saved photo's data from the Filesystem
            const readFile = await Filesystem.readFile({
                path: photo.filePath,
                directory: FilesystemDirectory.Data
            });

            // Web platform only: Save the photo into the base64 field
            photo.base64 = `data:image/jpeg;base64,${readFile.data}`;
            }
        }
    }
}
