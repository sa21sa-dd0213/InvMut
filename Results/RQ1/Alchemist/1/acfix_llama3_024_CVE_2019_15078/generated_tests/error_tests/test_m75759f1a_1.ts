import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m75759f1a - onlyOwner modifier", function () {
  it("should revert when a non-owner calls withdraw() due to onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call withdraw() from non-owner address - should revert with onlyOwner check
    await expect(
      instance.connect(addr1).withdraw()
    ).to.be.reverted;
  });
});