import React, {useState, useEffect} from "react";
import { listImages, softDeleteImage, hardDeleteImage } from "../../services/ImageService";
import { useNavigate } from "react-router-dom";
import UploadImages from "../../components/ImageUploader.jsx"




const ImageList = () => {
  const [imageList, setImageList] = useState([]);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  useEffect(() => {
    try{
      const stored = localStorage.getItem("selectedDataset");
      if (stored) setDataset(JSON.parse(stored));
    } catch (err) {
      console.error("Bad selectedDataset in localStorage", e);
    } finally {
      setLoading(false) // loading only for dataset fetch here
    }
  }, []);

  // fetch images once dataset is known
  useEffect(() => {
    if (!dataset) return;

    const fetchImages = async () => {
      try{
        const result = await listImages(dataset.id);
        setImageList(result);
      } catch (err){
        console.error("Failed to fetch images:", err)
      }
    };
    fetchImages()
  }, [dataset])


  const deleteImage = async () => {
    
    const imageId = "69088138637b58194f477bb9"

    //hard = await hardDeleteImage("6904b11c9af4b6414ef22540")
    //soft = softDeleteImage("68fb696d335f4ba4bc688236", imageId)
    
   
  }
  


    
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790]">
      {/* Header */}
      <div
        className="relative flex items-end justify-center flex-shrink-0"
        style={{ height: "70px", backgroundColor: "rgba(255,255,255,0.31)" }}
      >
        <img
          src="src/assets/aidxlogo.png"
          alt="AiDx Medical Logo"
          className="absolute left-[0px] top-[2px] bottom-[0px] pl-[3px] h-[40px] cursor-pointer 
               transition-transform duration-200 hover:scale-105"
          onClick = {() => navigate("/overview")}
        />
        <h1
          className="text-[#000000] text-[30px] font-[600] italic mb-[-2px]"
          style={{ textShadow: "0px 1px 0px rgba(0,0,0,0.15)" }}
        >
          List of {dataset?.name} Images
        </h1>
      </div>
      <div className ="flex flex-1 items-center justify-center mt-[1px]">
        <UploadImages
        datasetId = {dataset?.id}
        type = {"file"}/>
      </div>
      
      


      <div className="flex flex-1 items-center justify-center px-[10px] mt-[1px] mb-[12px]">
        <div
          className="rounded-[3px] flex flex-col relative overflow-hidden"
          style={{
            width: "min(95vw, 1500px)",
            height: "calc(min(90vh, 860px) - 16px)",
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.10)",
            boxShadow: "0px 1px 4px rgba(0,0,0,0.25)",
          }}
        >
          
          <div
            style={{
              height: "30px",
              backgroundColor: "#F3F3F3",
              borderBottom: "1px solid rgba(0,0,0,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div className="flex w-full h-full">
              {/* Linker helft */}
              <div className="flex-1 flex items-center justify-center">
                <span className="font-semibold text-black">Filenames</span>
              </div>

              {/* Verticale scheidslijn */}
              <div style={{ alignSelf:'stretch', width:'2px', background:'rgba(0,0,0,0.3)', margin:'0 8px' }} />


              {/* Rechter helft */}
              <div className="flex-1 flex items-center justify-center">
                <span className="font-semibold text-black">Annotated</span>
              </div>
            </div>

          </div>
          
          {/* Image List */}
            <ul className="flex-1 overflow-auto divide-y divide-gray-200 list-none m-0 p-0">
              {imageList
              .filter((img) => img.is_active) // only active images
              .map((img, idx) => {
                const key = img.id ?? img._id ?? idx;
                const fileName = img.fileName ?? img.originalFilename ?? "(no name)";
                const annotated = Boolean(false);

                return (
                  <li
                    key={key}
                    className="grid grid-cols-[1fr_140px] items-center bg-white hover:bg-gray-50 transition-colors"
                  >
                    {/* Filename cell */}
                    <div className="py-3 px-4">
                      <span className="text-gray-900 truncate inline-block max-w-full">
                        {fileName}
                      </span>
                    </div>

                    {/* Status indicator cell */}
                    <div className="py-3 px-4 flex items-center justify-center">
                      <span
                        style={{
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          borderRadius: "9999px",
                          backgroundColor: annotated ? "#22c55e" /* green-500 */ : "#d1d5db" /* gray-300 */,
                          border: `1px solid ${annotated ? "#16a34a" /* green-600 */ : "#6b7280" /* gray-500 */}`,
                          verticalAlign: "middle",
                        }}
                        title={annotated ? "Annotated" : "Not annotated"}
                        aria-label={annotated ? "Annotated" : "Not annotated"}
                      />

                    </div>
                  </li>
                );
              })}
            </ul>
        </div>
      </div>
    </div>
    )
}



export default ImageList;