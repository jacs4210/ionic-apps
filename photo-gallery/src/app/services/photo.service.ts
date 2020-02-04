import { Injectable } from '@angular/core';
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

    constructor() { }

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
    }

    private async savePicture(cameraPhoto: CameraPhoto) { }
}
