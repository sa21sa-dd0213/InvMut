import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant mdf335fbc test", function () {
  it("should kill the mutant by sending exactly 1 wei and checking owner balance remains unchanged", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Send exactly 1 wei to the go() function
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();

    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

    // In the original, contract forwards 1 wei to target, then transfers 0 to owner (balance unchanged)
    // In the mutant, contract forwards 0 wei to target, then transfers 1 wei to owner (balance increases)
    // So if owner balance changed, the mutant is detected
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);
  });
});