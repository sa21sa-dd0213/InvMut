import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - ArtCreated event emission", function () {
  it("should emit ArtCreated event when createArtFromFactory is called", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required before calling createArtFromFactory)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;

    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);

    // Get the PhiFactory contract address from the initialized instance
    const phiFactoryAddress = await instance.phiFactoryContract();

    // Since initialize sets phiFactoryContract to msg.sender (owner),
    // owner can call createArtFromFactory directly via the onlyPhiFactory modifier
    const artId = 1;

    // Deploy a simple mock to act as PhiFactory for artCreateFee and protocolFeeDestination
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy(instance.target);
    await mockFactory.waitForDeployment();

    // Set the phiFactoryContract address in the NFT contract to our mock
    // We need to do this by upgrading or using storage manipulation
    // For simplicity, let's use a different approach - we'll create a helper contract
    // that calls createArtFromFactory on behalf of the mock factory

    // Actually, since the initialize set phiFactoryContract to owner (msg.sender),
    // and owner is the deployer, we can just use owner to call createArtFromFactory
    // But we need to send ETH for the artCreateFee
    
    // Get the artCreateFee from the mock factory
    const artCreateFee = await mockFactory.artCreateFee();
    
    // Send ETH along with the transaction to cover the fee
    await expect(
      instance.connect(owner).createArtFromFactory(artId, { value: artCreateFee })
    ).to.emit(instance, "ArtCreated")
     .withArgs(artId, 1); // tokenIdCounter starts at 1

    // Verify tokenIdCounter incremented
    expect(await instance.tokenIdCounter()).to.equal(2);
  });
});