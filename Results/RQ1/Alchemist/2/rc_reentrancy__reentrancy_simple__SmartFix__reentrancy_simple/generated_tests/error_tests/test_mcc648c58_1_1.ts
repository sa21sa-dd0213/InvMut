import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - mcc648c58", function () {
  it("should detect the mutant that adds 1 extra wei to user balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial contract balance (should be 0)
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    expect(initialContractBalance).to.equal(0n);

    // Add exactly 1 wei to balance via addr1
    const depositAmount = 1n;
    const tx = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await tx.wait();

    // Check addr1's balance in the contract - should be exactly 1 wei in original
    const userBalanceAfterDeposit = await instance.getBalance(addr1.address);

    // Withdraw the balance
    const withdrawTx = await instance.connect(addr1).withdrawBalance();
    await withdrawTx.wait();

    // Check final contract balance - in original it should be 0, in mutant it will revert
    const finalContractBalance = await ethers.provider.getBalance(instance.target);

    // The mutant will fail this assertion because:
    // Original: deposits 1, balance becomes 1, withdraws 1, contract balance = 0
    // Mutant: deposits 1, balance becomes 2, tries to withdraw 2 but contract only has 1, reverts
    expect(finalContractBalance).to.equal(0n);
  });
});