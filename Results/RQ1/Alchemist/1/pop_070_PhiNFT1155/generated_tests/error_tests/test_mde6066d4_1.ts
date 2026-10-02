import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mde6066d4 - unPause access control", function () {
  it("should revert when non-owner tries to unpause the contract", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy the contract with constructor arguments (PhiNFT1155 has a constructor that calls _disableInitializers())
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract as owner
    await instance.connect(owner).initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );
    
    // First pause the contract as owner
    await instance.connect(owner).pause();
    
    // Verify contract is paused
    expect(await instance.paused()).to.be.true;
    
    // Non-owner tries to unpause - should revert in original, but mutant allows it
    await expect(
      instance.connect(nonOwner).unPause()
    ).to.be.revertedWith("OwnableUnauthorizedAccount");
  });
});