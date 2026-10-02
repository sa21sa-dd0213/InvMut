import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m8c179396 test", function () {
  it("should detect mutant that changes < to > in loop condition", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare arrays for the transfer call
    const tos = [addr1.address, addr2.address];
    const values = [100, 200];

    // Capture balances before the call
    const balanceBefore1 = await ethers.provider.getBalance(addr1.address);
    const balanceBefore2 = await ethers.provider.getBalance(addr2.address);

    // Call the transfer function - in original it should execute transfers, in mutant it will not
    const tx = await instance.transfer(owner.address, instance.address, tos, values);
    await tx.wait();

    // Check balances after the call
    const balanceAfter1 = await ethers.provider.getBalance(addr1.address);
    const balanceAfter2 = await ethers.provider.getBalance(addr2.address);

    // In the original contract, the transfers would have occurred (changing balances)
    // In the mutant, the loop never executes, so balances remain unchanged
    // This difference will kill the mutant
    expect(balanceAfter1).to.not.equal(balanceBefore1);
    expect(balanceAfter2).to.not.equal(balanceBefore2);
  });
});