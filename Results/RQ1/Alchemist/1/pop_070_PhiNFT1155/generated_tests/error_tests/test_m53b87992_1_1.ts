import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - m53b87992", function () {
  it("should kill mutant by sending msg.value exactly equal to artFee, which should succeed on original but revert on mutant due to zero refund attempt", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155 (no constructor arguments)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a minimal PhiFactory contract that returns the required values
    const MinimalPhiFactory = await ethers.getContractFactory(
      "contracts/MinimalPhiFactory.sol:MinimalPhiFactory"
    );
    const factory = await MinimalPhiFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    // Initialize the NFT contract with the factory as msg.sender
    // We need to call initialize from the factory address to set phiFactoryContract
    // Use the factory to call initialize on the NFT contract
    await factory.initializeNFT(
      instanceAddress,
      1, // credChainId
      1, // credId
      "test", // verificationType
      addr1.address // protocolFeeDestination
    );

    // Now we need to call createArtFromFactory with msg.value == artFee
    // First, set the artCreateFee in the factory
    const artFee = ethers.parseEther("1.0");
    await factory.setArtCreateFee(artFee);

    // Call createArtFromFactory with exactly artFee
    const tx = await factory.callCreateArtFromFactory(instanceAddress, 1, {
      value: artFee,
    });

    // The transaction should succeed (no revert)
    await expect(tx).to.not.be.reverted;

    // Verify the art was created
    const tokenIdCounter = await instance.tokenIdCounter();
    expect(tokenIdCounter).to.equal(2); // Started at 1, incremented to 2
  });
});