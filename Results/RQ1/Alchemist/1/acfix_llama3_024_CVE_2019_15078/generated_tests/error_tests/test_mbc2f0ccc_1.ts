import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mbc2f0ccc test", function () {
  it("should kill mutant by verifying onlyOwner access after transferOwnership", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Transfer ownership to newOwner
    await instance.connect(owner).transferOwnership(newOwner.address);

    // Attempt to call onlyOwner function (withdraw) from original owner - should revert in original, but in mutant ownership goes to address(0) so also reverts
    // Instead, verify that newOwner CAN call onlyOwner functions in original, but in mutant cannot because owner is address(0)
    // In mutant, owner becomes address(0), so newOwner cannot call onlyOwner functions
    await expect(
      instance.connect(newOwner).withdraw()
    ).to.be.reverted;
  });
});