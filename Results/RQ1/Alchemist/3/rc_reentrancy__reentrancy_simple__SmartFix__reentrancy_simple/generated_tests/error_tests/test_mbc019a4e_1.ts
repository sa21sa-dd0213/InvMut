import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbc019a4e test", function () {
  it("should detect mutant by verifying balance equals sent amount after addToBalance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to addToBalance
    const tx = await instance.addToBalance({ value: 1 });
    await tx.wait();

    // Check balance - should be 1 wei in original, but 0 in mutant (since msg.value-1 = 0)
    const balance = await instance.getBalance(owner.address);
    expect(balance).to.equal(1);
  });
});