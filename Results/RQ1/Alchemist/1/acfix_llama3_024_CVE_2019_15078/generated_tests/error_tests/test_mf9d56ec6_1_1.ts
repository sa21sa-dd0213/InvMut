import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mf9d56ec6 - burn function", function () {
  it("should detect the mutant by allowing burn of full balance (original passes, mutant reverts)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get owner's initial balance (should be totalDistributed = 200000000e18)
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Attempt to burn the exact full balance of the owner
    const tx = instance.burn(ownerBalance);
    
    // Original contract: should succeed (<= allows burning full balance)
    // Mutant contract: should revert (< rejects burning full balance)
    await expect(tx).to.not.be.reverted;
  });
});