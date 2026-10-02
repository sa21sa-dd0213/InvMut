import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m6dd0e369 test", function () {
  it("should detect the mutant that subtracts 1 from msg.value in addToBalance", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits exactly 1 wei
    const depositAmount = 1n;
    const tx = await instance.connect(user).addToBalance({ value: depositAmount });
    await tx.wait();

    // User tries to withdraw the deposited amount
    const withdrawTx = instance.connect(user).withdrawBalance();
    
    // On the original contract, this would succeed and send 1 wei back.
    // On the mutant, the balance credited is 0 (msg.value - 1 = 0), so withdrawal
    // either reverts (because of call failure) or sends 0 value.
    // We expect the transaction to revert or the user's balance to be 0.
    await expect(withdrawTx).to.be.reverted;
  });
});