import React, {useState, useEffect, useContext} from "react";
import { listImages, softDeleteImage, hardDeleteImage } from "../../services/ImageService";
import UploadImages from "../../components/ImageUploader.jsx"
import Header from "../../components/Header.jsx";
import { AuthContext } from "../../components/AuthContext.jsx";
import { getImageAnnotation } from "../../services/annotationService.js";




const ImageList = () => {
  const [imageList, setImageList] = useState([]);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState(null)
  const {currentUser} = useContext(AuthContext)


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
  const fetchImages = async () => {
    if (!dataset) return;
    try {
      const result = await listImages(dataset.id);
      
      setImageList(result);
    } catch (err) {
      console.error("Failed to fetch images:", err);
    }
  };

  const fetchAnnotations = async () => {
    if (!imageList) return;
    const allAnnotation = {}
    for (const image of imageList) {
      try {
       
        const result = await getImageAnnotation(image.id);
        allAnnotation[image.id] = result
      } catch (err) {
        console.error("Failed to fetch annotation for image", image.id, err);
      }
    }
    setAnnotations(allAnnotation)
    }

  // haal eenmalig op als dataset bekend is
  useEffect(() => {
    if (!dataset) return;
    fetchImages();
  }, [dataset]);

  useEffect(() => {
    if (!imageList) return;
    fetchAnnotations();
  }, [imageList]);

  const handleUploaded = async () => {
    await fetchImages();
  }


    
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790]">
      {/* Header */}
      <Header title={dataset ? `List of ${dataset.name} Images` : "List of Images"} currentUser={currentUser}/>
      
      <div className ="flex flex-1 items-center justify-center mt-[1px]">
        <UploadImages
        datasetId = {dataset?.id}
        onDone={handleUploaded}
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
                const annotation = annotations[img.id];
                
                const annotated = annotation?.annotations?.length > 0;

                return (
                  <li
                    key={key}
                    className="grid grid-cols-[minmax(0,1fr)_140px] items-center bg-white hover:bg-gray-50 transition-colors py-3"
                  >
                    {/* Filename cell */}
                    <div className="px-4 min-w-0">
                      <span className="block truncate text-gray-900">
                        {fileName}
                      </span>
                    </div>

                    {/* Status indicator cell */}
                    <div className="px-4 flex items-center justify-center">
                      <span
                        style={{
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          borderRadius: "9999px",
                          backgroundColor: annotated ? "#22c55e" : "#d1d5db",
                          border: `1px solid ${annotated ? "#16a34a" : "#6b7280"}`,
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