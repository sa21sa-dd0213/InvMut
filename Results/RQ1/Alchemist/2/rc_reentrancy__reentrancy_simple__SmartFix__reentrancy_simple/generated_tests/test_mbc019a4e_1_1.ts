import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbc019a4e test", function () {
  it("should detect that addToBalance credits msg.value-1 instead of msg.value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to addToBalance
    const tx = await instance.connect(owner).addToBalance({ value: 1 });
    await tx.wait();

    // Check the balance - should be 1 in original, but 0 in mutant (1-1=0)
    const balance = await instance.getBalance(owner.address);
    expect(balance).to.equal(1);
  });
});