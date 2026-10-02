import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant md13efe36", function () {
  it("should return the created token ID from createArtFromFactory", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the actual PhiNFT1155 contract
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155.deploy();
    await phiNFT1155.waitForDeployment();
    
    // Deploy a mock PhiFactory contract that implements the required interface
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize the PhiNFT1155 contract with the mock factory as the deployer
    // Since initialize sets phiFactoryContract to msg.sender, we need to call it from the mock factory
    // But we can't do that directly in tests. Instead, we'll use the owner to initialize,
    // then manually set the phiFactoryContract via storage manipulation or by using a custom setup
    
    // First, deploy a new PhiNFT1155 instance
    const PhiNFT1155v2 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155v2 = await PhiNFT1155v2.deploy();
    await phiNFT1155v2.waitForDeployment();
    
    // Initialize with owner as deployer
    await phiNFT1155v2.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );
    
    // Now we need to set the phiFactoryContract to our mock factory
    // Since there's no setter, we'll deploy a helper contract that can call createArtFromFactory
    // Or we can use the mock factory to make the call
    
    // Get the artCreateFee from the mock factory
    const createFee = await mockFactory.artCreateFee();
    
    // The createArtFromFactory requires msg.sender to be phiFactoryContract
    // We need to call it through the mock factory which will forward the call
    const tx = await mockFactory.callCreateArtFromFactory(phiNFT1155v2.target, 1, { value: createFee });
    const receipt = await tx.wait();
    
    // Get the returned token ID from the transaction logs
    // The ArtCreated event emits (artId, tokenId)
    const iface = new ethers.Interface([
      "event ArtCreated(uint256 artId, uint256 tokenId)"
    ]);
    
    let tokenId;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "ArtCreated") {
          tokenId = parsed.args.tokenId;
          break;
        }
      } catch (e) {
        // Not our event, skip
      }
    }
    
    // Verify tokenId is 1 (first token)
    expect(tokenId).to.equal(1);
    
    // Verify tokenIdCounter has been incremented
    const tokenIdCounter = await phiNFT1155v2.tokenIdCounter();
    expect(tokenIdCounter).to.equal(2);
  });
});