import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant md13efe36", function () {
  it("should return the created token ID from createArtFromFactory", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155.deploy();
    await phiNFT1155.waitForDeployment();
    
    // Deploy a mock PhiFactory to call initialize and createArtFromFactory
    // Since we need the PhiFactory contract, we'll deploy a minimal mock
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize the PhiNFT1155 contract
    await phiNFT1155.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );
    
    // Set the phiFactoryContract in the mock (this would normally be set during initialization)
    // Since initialize sets phiFactoryContract to msg.sender, we need to set it to our mock
    // We can do this by calling initialize with the mock factory address as deployer
    // But since initialize is only called once, we'll deploy a new instance with the mock factory as deployer
    
    const PhiNFT1155v2 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155v2 = await PhiNFT1155v2.deploy();
    await phiNFT1155v2.waitForDeployment();
    
    // Deploy mock factory as the owner
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory2 = await MockFactory.deploy();
    await mockFactory2.waitForDeployment();
    
    // Initialize with mock factory as deployer (owner)
    await phiNFT1155v2.initialize(
      1,
      1,
      "test",
      owner.address
    );
    
    // Now call createArtFromFactory as the phiFactoryContract
    // The function is payable and requires msg.sender to be phiFactoryContract
    // We'll call it through the mock factory
    const artId = 1;
    const createFee = await phiNFT1155v2.phiFactoryContract().then(factory => factory.artCreateFee());
    
    // Call createArtFromFactory through the mock factory
    const tx = await mockFactory2.callCreateArtFromFactory(phiNFT1155v2.target, artId, { value: createFee });
    const receipt = await tx.wait();
    
    // Get the returned token ID from the transaction
    // The function returns uint256, so we can check the return value
    const returnData = receipt.logs[0].data; // This is simplified - we need to decode the return
    
    // Better approach: call the function directly and check the return value
    const returnValue = await mockFactory2.callStaticCreateArtFromFactory(phiNFT1155v2.target, artId, { value: createFee });
    
    // The returned value should be 1 (first token ID)
    expect(returnValue).to.equal(1);
    
    // Verify tokenIdCounter has been incremented
    const tokenIdCounter = await phiNFT1155v2.tokenIdCounter();
    expect(tokenIdCounter).to.equal(2);
  });
});

// Mock contract to simulate PhiFactory
// Note: In a real test, you would use the actual PhiFactory contract
// This is a simplified version for testing purposes
contract MockPhiFactory {
    function artCreateFee() external pure returns (uint256) {
        return 0.01 ether;
    }
    
    function protocolFeeDestination() external view returns (address) {
        return msg.sender;
    }
    
    function callCreateArtFromFactory(address phiNFT, uint256 artId) external payable returns (uint256) {
        (bool success, bytes memory data) = phiNFT.call{value: msg.value}(
            abi.encodeWithSignature("createArtFromFactory(uint256)", artId)
        );
        require(success, "call failed");
        return abi.decode(data, (uint256));
    }
    
    function callStaticCreateArtFromFactory(address phiNFT, uint256 artId) external view returns (uint256) {
        // This is a static call simulation - in reality you'd use ethers
        return 0;
    }
}