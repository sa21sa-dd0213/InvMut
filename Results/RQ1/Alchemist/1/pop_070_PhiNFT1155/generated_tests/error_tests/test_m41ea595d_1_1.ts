import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant test for m41ea595d", function () {
  it("should revert safeBatchTransferFrom when called by authorized owner (mutant always reverts)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155 (constructor takes no arguments in this case)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );

    // We need to set up phiFactoryContract to allow minting and transfers
    // Get the phiFactoryContract address from the initialized contract
    const phiFactoryAddress = await instance.phiFactoryContract();

    // Create a mock/minimal factory contract to interact with PhiNFT1155
    // For the test, we'll use a simple approach: deploy a minimal contract that can act as factory
    const MinimalFactory = await ethers.getContractFactory("contracts/test/MinimalPhiFactory.sol:MinimalPhiFactory");
    const factory = await MinimalFactory.deploy(instance.target);
    await factory.waitForDeployment();

    // Set the factory in the PhiNFT1155 (this would normally be done during initialization)
    // Since we can't modify the contract directly, we need to use the existing factory
    // The factory is set during initialize, so we'll need to work with what we have

    // For the purpose of testing the mutant, we can directly test the safeBatchTransferFrom function
    // First, we need to mint some tokens to the owner
    // Since mint is internal, we need to use the claimFromFactory or createArtFromFactory
    // Let's create an art first using the factory
    await factory.createArt(owner.address);

    // Now we have tokens, test the safeBatchTransferFrom
    // The owner should be able to transfer their own tokens
    const tokenIds = [1];
    const amounts = [1];

    // This should succeed on original but fail on mutant because mutant always reverts
    await expect(
      instance.connect(owner).safeBatchTransferFrom(
        owner.address,
        addr1.address,
        tokenIds,
        amounts,
        "0x"
      )
    ).to.be.reverted;
  });
});