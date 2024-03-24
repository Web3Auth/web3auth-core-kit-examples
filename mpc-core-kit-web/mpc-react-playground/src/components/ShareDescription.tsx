import React from "react";

// Define the type for the shareDescriptions prop
interface ShareDescriptionComponentProps {
  shareDescriptions: {
    [key: string]: string[]; // Assuming the array of strings based on your example
  };
}

const ShareDescriptionComponent: React.FC<ShareDescriptionComponentProps> = ({ shareDescriptions }) => {
  const renderShareDescriptions = () => {
    return Object.keys(shareDescriptions).map((key) => {
      const shareInfo = shareDescriptions[key][0];
      const shareData = JSON.parse(shareInfo);

      // Extract category from the shareData
      const category = shareData.browserName || shareData.authenticator || "Other";

      return (
        <div key={key}>
          <h3>Category: {category}</h3>
          <p>Module: {shareData.module}</p>
          <p>Date Added: {new Date(shareData.dateAdded).toString()}</p>
          {/* Add other information you want to display */}
        </div>
      );
    });
  };

  return (
    <div>
      <h2>Share Descriptions</h2>
      {renderShareDescriptions()}
    </div>
  );
};

export default ShareDescriptionComponent;
