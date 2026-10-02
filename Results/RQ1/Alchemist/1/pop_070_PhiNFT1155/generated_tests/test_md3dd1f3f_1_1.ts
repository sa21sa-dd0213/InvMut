import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant md3dd1f3f - getTokenIdFromFactoryArtId", function () {
  it("should return correct tokenId after art creation, killing mutant that removes return statement", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a minimal mock factory that implements IPhiFactory interface
    const MinimalFactory = await ethers.getContractFactory("MinimalPhiFactory");
    const mockFactory = await MinimalFactory.deploy();
    await mockFactory.waitForDeployment();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract with the mock factory as the caller
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;

    // We need to initialize through the factory contract to set phiFactoryContract
    // The initialize function sets phiFactoryContract to msg.sender
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);

    // Now set the phiFactoryContract to our mock factory
    // We need to impersonate the owner to update the factory address if possible
    // Since there's no setter, we'll use a workaround: deploy a new instance through the mock factory
    
    // Actually, let's deploy a new instance and initialize it with the mock factory as the caller
    const Factory2 = await ethers.getContractFactory("PhiNFT1155");
    const instance2 = await Factory2.deploy();
    await instance2.waitForDeployment();

    // Deploy a helper contract that will call initialize with the mock factory as msg.sender
    const InitializeHelper = await ethers.getContractFactory("InitializeHelper");
    const helper = await InitializeHelper.deploy();
    await helper.waitForDeployment();

    // Use the helper to initialize instance2 with the mock factory as msg.sender
    await helper.initializeWithFactory(
      instance2.target,
      mockFactory.target,
      credChainId,
      credId,
      verificationType,
      protocolFeeDest
    );

    // Now we need to set the protocolFeeDestination on the mock factory
    // The mock factory should have a function to set it
    await mockFactory.setProtocolFeeDestination(owner.address);
    
    // Also set the artCreateFee on the mock factory
    await mockFactory.setArtCreateFee(ethers.parseEther("0.001"));

    // Now call createArtFromFactory with a specific artId
    const artId = 42;
    const tx = await instance2.createArtFromFactory(artId, { value: ethers.parseEther("0.001") });
    await tx.wait();

    // The created tokenId should be 1 (since tokenIdCounter starts at 1)
    const expectedTokenId = 1;

    // Get the tokenId from factory artId
    const returnedTokenId = await instance2.getTokenIdFromFactoryArtId(artId);

    // The original returns the correct tokenId (1), the mutant returns 0
    expect(returnedTokenId).to.equal(expectedTokenId);
  });
});