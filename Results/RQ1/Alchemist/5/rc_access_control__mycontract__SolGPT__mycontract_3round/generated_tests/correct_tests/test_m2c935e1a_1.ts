import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract - mutant m2c935e1a test", function () {
  it("should revert when owner calls sendTo (mutant inverts access control)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant requires msg.sender != owner, so owner calling should revert
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});