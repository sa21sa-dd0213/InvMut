import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - m6dd0e369", function () {
  it("should detect mutant that subtracts 1 wei from msg.value in addToBalance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to addToBalance
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    const tx = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await tx.wait();

    // Check the recorded balance - should be 1 wei in original, but 0 wei in mutant
    const balance = await instance.getBalance(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});