import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mc71883a7 - transfer onlyPayloadSize", function () {
  it("should revert on transfer due to mutated onlyPayloadSize modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt a normal transfer - should fail on mutant because 2**32 is impossibly large
    const amount = ethers.parseEther("1");
    await expect(
      instance.connect(owner).transfer(addr1.address, amount)
    ).to.be.reverted;
  });
});