import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
  it("should kill mutant mcc54cd54 by calling airDrop twice, expecting revert on second call due to mutated require", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Bank contract (required by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call - should succeed (balance is 0, passes hasNoBalance and the require)
    const tx1 = await instance.connect(addr1).airDrop();
    await tx1.wait();

    // Verify balance is now 20
    const balanceAfterFirst = await instance.tokenBalance(addr1.address);
    expect(balanceAfterFirst).to.equal(20);

    // Second call - should revert due to hasNoBalance modifier
    const tx2 = instance.connect(addr1).airDrop();
    await expect(tx2).to.be.reverted;
  });
});