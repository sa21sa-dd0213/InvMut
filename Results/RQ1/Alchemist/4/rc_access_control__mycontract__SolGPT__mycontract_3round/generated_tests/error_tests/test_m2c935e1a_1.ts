import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m2c935e1a by calling sendTo from owner and expecting success (mutant will revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    const receiver = addr1.address;

    // Owner calls sendTo - should succeed on original, revert on mutant (msg.sender != owner)
    await expect(
      instance.connect(owner).sendTo(receiver, amount)
    ).to.not.be.reverted;
  });
});