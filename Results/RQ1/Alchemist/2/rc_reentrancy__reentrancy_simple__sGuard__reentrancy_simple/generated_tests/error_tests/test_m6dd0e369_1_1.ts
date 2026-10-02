import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - m6dd0e369", function () {
  it("should kill mutant that uses msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to addToBalance
    const tx = await instance.connect(addr1).addToBalance({ value: 1 });
    await tx.wait();

    // Check the stored balance - should be 1 on original, 0 on mutant
    const balance = await instance.getBalance(addr1.address);
    expect(balance).to.equal(1);
  });
});