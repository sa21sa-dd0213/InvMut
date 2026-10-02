import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - mbc019a4e", function () {
  it("should detect mutant that uses msg.value-1 instead of msg.value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 100 wei to the contract via addToBalance
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    const tx = await instance.connect(owner).addToBalance({ value: depositAmount });
    await tx.wait();

    // Check the balance stored for the owner
    const balance = await instance.getBalance(owner.address);

    // Original would store exactly depositAmount; mutant stores depositAmount - 1 wei
    // This assertion will pass on original but fail on mutant
    expect(balance).to.equal(depositAmount);
  });
});