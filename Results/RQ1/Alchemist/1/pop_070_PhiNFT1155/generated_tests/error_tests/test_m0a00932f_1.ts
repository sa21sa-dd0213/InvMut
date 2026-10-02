import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m0a00932f - whenNotPaused modifier removal", function () {
  it("should revert when createArtFromFactory is called while contract is paused (original behavior), but mutant would allow it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT1155 = await PhiNFT1155.deploy();
    await phiNFT1155.waitForDeployment();
    
    // Deploy a mock PhiFactory contract to satisfy the onlyPhiFactory modifier
    // The factory needs to be deployed first, then we initialize PhiNFT1155
    const PhiFactory = await ethers.getContractFactory("PhiFactory");
    const phiFactory = await PhiFactory.deploy();
    await phiFactory.waitForDeployment();
    
    // Initialize PhiNFT1155 with required parameters
    await phiNFT1155.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      addr1.address // protocolFeeDestination
    );
    
    // Pause the contract
    await phiNFT1155.pause();
    
    // Verify contract is paused
    expect(await phiNFT1155.paused()).to.equal(true);
    
    // Attempt to call createArtFromFactory - should revert on original due to whenNotPaused
    // On the mutant (without whenNotPaused), this would succeed, killing the mutant
    await expect(
      phiNFT1155.connect(addr1).createArtFromFactory(1)
    ).to.be.reverted;
    
    // Additional verification - call with proper PhiFactory address
    // The onlyPhiFactory modifier requires msg.sender to be phiFactoryContract
    await expect(
      phiNFT1155.connect(await phiFactory.getAddress()).createArtFromFactory(1)
    ).to.be.revertedWith("EnforcedPause");
  });
});