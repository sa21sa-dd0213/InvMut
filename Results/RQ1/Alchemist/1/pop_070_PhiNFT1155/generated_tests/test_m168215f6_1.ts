import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - m168215f6", function () {
  it("should allow PhiFactory to call onlyPhiFactory functions, but mutant always reverts", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT = await PhiNFT1155Factory.deploy();
    await phiNFT.waitForDeployment();
    const phiNFTAddress = await phiNFT.getAddress();

    // Deploy a mock PhiFactory contract that can act as the PhiFactory
    // We need a contract that implements the expected interface
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    const mockFactoryAddress = await mockFactory.getAddress();

    // Initialize PhiNFT1155 with the mock factory as the deployer (msg.sender)
    // The initialize function sets phiFactoryContract = msg.sender
    await phiNFT.connect(owner).initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );

    // Now phiFactoryContract is owner (since msg.sender during init was owner)
    // But we need the PhiFactory to be the mock factory for the test
    // We can't change it directly, so let's redeploy with proper setup
    // Actually, let's use a different approach: deploy a new PhiNFT1155 and
    // have the mock factory call initialize so it becomes the phiFactoryContract

    const phiNFT2 = await PhiNFT1155Factory.deploy();
    await phiNFT2.waitForDeployment();
    const phiNFT2Address = await phiNFT2.getAddress();

    // Initialize with mock factory as caller (msg.sender)
    await phiNFT2.connect(mockFactory.getSigner()).initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );

    // Now phiFactoryContract should be the mock factory address
    const factoryAddr = await phiNFT2.phiFactoryContract();
    expect(factoryAddr).to.equal(mockFactoryAddress);

    // Try to call createArtFromFactory from the mock factory (the authorized caller)
    // In the original contract, this should succeed
    // In the mutant, it will always revert because condition is always true
    await expect(
      phiNFT2.connect(mockFactory.getSigner()).createArtFromFactory(1, { value: 0 })
    ).to.not.be.reverted;
  });
});

// Mock contract to act as PhiFactory
// We need a minimal contract that has the required functions
// This will be deployed as a separate contract
contract("MockPhiFactory", function () {
  // Just need an address that can call initialize and createArtFromFactory
  // The actual implementation doesn't matter for this test
});