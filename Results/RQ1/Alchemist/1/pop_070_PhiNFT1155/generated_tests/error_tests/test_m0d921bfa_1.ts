import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m0d921bfa - claimFromFactory with non-existent artId", function () {
  it("should revert when calling claimFromFactory with an artId that has not been created", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 - constructor has no arguments (constructor() { _disableInitializers(); })
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock PhiFactory contract to set as phiFactoryContract
    // Since we need a valid PhiFactory, we'll deploy a minimal mock that returns required values
    const MockFactory = await ethers.getContractFactory("PhiNFT1155MockFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize the PhiNFT1155 contract
    // initialize(uint256 credChainId_, uint256 credId_, string memory verificationType_, address protocolFeeDestination_)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDestination = addr1.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDestination);
    
    // Get the initialized phiFactoryContract address (which is msg.sender = owner)
    // Since phiFactoryContract is set to msg.sender in initialize, we need to update it
    // We'll use the mock factory by calling the setter or directly manipulating storage
    // Actually, let's deploy with the mock factory approach
    
    // Redeploy with a setup that allows us to set phiFactoryContract
    // For this test, we'll directly set the phiFactoryContract via storage if needed
    // But let's use a simpler approach - deploy and initialize, then use the fact that
    // phiFactoryContract is set to msg.sender (owner) during initialization
    
    // The key test: call claimFromFactory with an artId that hasn't been created
    // claimFromFactory(uint256 artId_, address minter_, address ref_, address verifier_, uint256 quantity_, bytes32 data_, string calldata imageURI_)
    // The function checks _artIdToTokenId[artId_] which will be 0 for non-existent art
    
    const nonExistentArtId = 999;
    const minter = addr2.address;
    const ref = ethers.ZeroAddress;
    const verifier = ethers.ZeroAddress;
    const quantity = 1;
    const data = ethers.ZeroHash;
    const imageURI = "https://example.com/nonexistent.jpg";
    
    // Expect revert because tokenId_ will be 0 for non-existent art
    await expect(
      instance.claimFromFactory(
        nonExistentArtId,
        minter,
        ref,
        verifier,
        quantity,
        data,
        imageURI
      )
    ).to.be.reverted;
  });
});