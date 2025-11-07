import { softDeleteDataset, hardDeleteDataset } from "../services/datasetService";
import { hardDeleteDatasetImages, softDeleteDatasetImages } from "../services/ImageService";


export async function soft_Delete_Dataset(datasetId) {
    
    try{

        await softDeleteDatasetImages(datasetId);

        const result = await softDeleteDataset(datasetId);

        return result;
    } catch (err) {
        console.error("Soft delete datasete failed:", err);
        throw err;
    }
    
}

export async function hard_Delete_Dataset(datasetId) {
  try {
    await hardDeleteDatasetImages(datasetId);
    const result = await hardDeleteDataset(datasetId);
    return result;
  } catch (err) {
    console.error("Hard delete dataset failed:", err);
    throw err;
  }
}
