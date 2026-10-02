import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - mb915be43", function () {
  it("should revert or fail when depositing 1 wei and then withdrawing all - mutant undercounts balance by 1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei from addr1
    const depositTx = await instance.connect(addr1).deposit({ value: 1 });
    await depositTx.wait();

    // Attempt to withdraw all
    const withdrawTx = instance.connect(addr1).withdrawAll();

    // In the mutant, balance becomes 0 instead of 1, so either:
    // - the call returns false (require fails) and transaction reverts, OR
    // - the transfer succeeds but sends 0 wei, leaving the deposited 1 wei stuck
    // We expect the withdrawal to revert because require(callResult) will fail
    // when sending 0 wei via .call{value: 0}
    await expect(withdrawTx).to.be.reverted;
  });
});