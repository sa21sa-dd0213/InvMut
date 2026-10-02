import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending to zero address (mutant detection)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send to zero address - should revert in original, pass in mutant
    await expect(
      instance.connect(owner).sendTo(ethers.ZeroAddress, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});