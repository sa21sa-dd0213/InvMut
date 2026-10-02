import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant m3e63990b test", function () {
  it("should revert when called from non-owner address after mutant removes owner check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = addr1.address;
    const amount = ethers.parseEther("0.1");

    // This call should revert in the original due to owner check,
    // but the mutant will allow it - we expect revert to detect the mutant
    await expect(
      instance.connect(addr1).sendTo(receiver, amount)
    ).to.be.reverted;
  });
});