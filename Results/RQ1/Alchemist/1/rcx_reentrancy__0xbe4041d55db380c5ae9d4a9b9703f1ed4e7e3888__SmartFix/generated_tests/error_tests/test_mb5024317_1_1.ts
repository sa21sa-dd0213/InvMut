import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mb5024317 test", function () {
  it("should revert when calling Put with positive msg.value due to subtraction bug", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(((acc.balance + msg.value) >= acc.balance))
    // to require(((acc.balance - msg.value) >= acc.balance))
    // Sending any positive amount should now revert because (balance - amount) < balance
    await expect(
      instance.connect(owner).Put(0, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});