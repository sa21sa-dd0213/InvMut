import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant md3dd1f3f - getTokenIdFromFactoryArtId", function () {
  it("should return correct tokenId after art creation, killing mutant that removes return statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor takes no arguments, uses _disableInitializers)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // We need to initialize the contract first
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // Since we cannot directly call createArtFromFactory (requires onlyPhiFactory modifier),
    // we need to understand the mapping behavior. The mapping _artIdToTokenId is private,
    // so we need to test through the public interface.
    // 
    // The function getTokenIdFromFactoryArtId reads from _artIdToTokenId mapping.
    // For a non-existent artId, it should return 0 (default).
    // For an artId that exists in the mapping, it should return the corresponding tokenId.
    //
    // Since we cannot directly set the mapping, we test the default behavior:
    // For any artId that hasn't been mapped, the function should return 0.
    // The mutant removes the return statement, so it would also return 0 for any input.
    // 
    // To distinguish original from mutant, we need to test with an artId that would
    // have a non-zero mapping. Since we can't call createArtFromFactory without the
    // phiFactoryContract being set, we need to deploy a mock factory.
    
    // Deploy a simple mock that returns the protocol fee destination
    const MockFactory = await ethers.getContractFactory("IPhiFactory");
    // Instead, let's deploy a minimal contract that implements the needed interface
    const MinimalFactory = await ethers.getContractFactory("contracts/test/MinimalPhiFactory.sol:MinimalPhiFactory");
    const mockFactory = await MinimalFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Set the phiFactoryContract address (the initialize sets it to msg.sender)
    // We need to redeploy with the mock factory as the caller
    const FactoryWithMock = await ethers.getContractFactory("PhiNFT1155");
    const instance2 = await FactoryWithMock.deploy();
    await instance2.waitForDeployment();
    
    // Initialize with mock factory as msg.sender (owner)
    await instance2.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
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