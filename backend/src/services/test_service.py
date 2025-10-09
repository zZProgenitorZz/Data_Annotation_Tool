import asyncio
from backend.src.services.image_service import ImageService
from backend.src.services.dataset_service import DatasetService

base_path = "C:/Users/Lenovo/Documents/VS Project/DataAnnotationTool/images"
image_service = ImageService(base_path)
dataset_service = DatasetService(base_path)


# Test met een image die in die folder staat
async def test_add_image():
    result = await image_service.add_image("rode-bloedcellen.jpg", dataset_id= "68cbce3fa73e659f7f62963d", uploaded_by= "68c806df2d75e0c5ee681a93")
    return result

# Test met een bulk fotos die in een folder
async def test_add_image_dataset():
    result = await dataset_service.add_images_to_dataset(dataset_id= "68d14d6e96ed855f19185b39", image_files= ["rode-bloedcellen.jpg", "parasieten.png"], uploaded_by= "68c806df2d75e0c5ee681a93")
    return result

# Test of dataset wrodt terug gegeven met total_images en assigned to users
async def test_find_dataset():
    result = await dataset_service.get_dataset("68d14d6e96ed855f19185b39")
    return result

async def main():
    
    result = await test_find_dataset()
    print(result)



if __name__ == "__main__":
    asyncio.run(main())


 # Test soft delete and restore
    #result = await service.restore_image("68cc041f259d4a1b5fb4b16b")
    

    #Test bulk soft delete and restore
    #result = await service.restore_dataset_images("68cbce3fa73e659f7f62963d")
    #print(result)