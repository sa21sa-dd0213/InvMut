import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test m7b7a7920", function () {
  it("should revert when sending zero amount (detect >= mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 0 amount - should revert in original, but mutant allows it
    await expect(
      instance.connect(owner).sendTo(addr1.address, 0)
    ).to.be.reverted;
  });
});