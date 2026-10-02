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

    // Attempt to call onlyOwner function (withdraw) from newOwner - should revert because in mutant owner becomes address(0)
    await expect(
      instance.connect(newOwner).withdraw()
    ).to.be.reverted;
  });
});