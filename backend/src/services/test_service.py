import asyncio
from backend.src.services.image_service import ImageService

async def main():
    base_path = "C:/Users/Lenovo/Documents/VS Project/DataAnnotationTool/images"
    service = ImageService(base_path)

    # Test met een image die in die folder staat
    #result = await service.add_image("rode-bloedcellen.jpg", dataset_id= "68cbce3fa73e659f7f62963d", uploaded_by= "68c806df2d75e0c5ee681a93")
    #print(result)

    # Test soft delete and restore
    #result = await service.restore_image("68cc041f259d4a1b5fb4b16b")
    

    #Test bulk soft delete and restore
    result = await service.restore_dataset_images("68cbce3fa73e659f7f62963d")

    print(result)

if __name__ == "__main__":
    asyncio.run(main())
