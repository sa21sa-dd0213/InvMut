import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - constructor sets ownerAddress to address(0)", function () {
  it("should fail when owner tries to call owner-restricted function after deployment with valid owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const treasuryAddress = addr1.address;
    
    // Deploy with owner address
    const instance = await Factory.deploy(owner.address, treasuryAddress);
    await instance.waitForDeployment();
    
    // If constructor correctly sets _ownerAddress = ownerAddress, this should succeed
    // If mutant sets _ownerAddress = address(0), this will revert because msg.sender != address(0)
    await expect(
      instance.connect(owner).adjustAdminAccess(addr1.address, true)
    ).to.not.be.reverted;
  });
});