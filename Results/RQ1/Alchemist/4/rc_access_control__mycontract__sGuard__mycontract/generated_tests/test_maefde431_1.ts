import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test - kill maefde431", function () {
  it("should revert when unauthorized address calls sendTo", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = unauthorized.address;
    const amount = ethers.parseEther("0.1");

    // Unauthorized call should revert on original contract, succeed on mutant
    await expect(
      instance.connect(unauthorized).sendTo(receiver, amount)
    ).to.be.reverted;
  });
});