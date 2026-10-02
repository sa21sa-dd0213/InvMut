import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - constructor ownerAddress replaced with address(this)", function () {
  it("should revert when owner tries to call admin functions after deployment with correct owner address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy GameItems with owner address as the owner
    const treasuryAddress = addr1.address;
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, treasuryAddress);
    await instance.waitForDeployment();
    
    // In the original contract, owner should be able to call adjustAdminAccess
    // In the mutant, _ownerAddress is set to address(this) instead of owner.address
    // So calling from owner should revert because msg.sender != address(this)
    await expect(
      instance.connect(owner).adjustAdminAccess(addr1.address, true)
    ).to.be.reverted;
  });
});