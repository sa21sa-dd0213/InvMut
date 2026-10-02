import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test - maecf5ec5", function () {
  it("should revert when owner calls sendTo because mutant requires msg.sender != owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner should be able to call sendTo in the original contract
    // In the mutant, require(msg.sender != owner) will cause a revert when owner calls
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("1.0"))
    ).to.be.reverted;
  });
});