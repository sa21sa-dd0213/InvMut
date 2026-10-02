import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbac3ac5d test", function () {
  it("should detect mutant by sending 1 wei and expecting exact withdrawal", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to addToBalance
    const tx = await instance.connect(user).addToBalance({ value: ethers.parseEther("0") + 1n });
    await tx.wait();

    // Get user's recorded balance
    const userBalance = await instance.getBalance(user.address);
    // In original: userBalance == 1 wei
    // In mutant: userBalance == 2 wei (because msg.value+1)

    // Now withdraw
    const withdrawTx = instance.connect(user).withdrawBalance();

    // In original: withdraw succeeds, contract balance becomes 0
    // In mutant: contract tries to send 2 wei but only has 1 wei -> reverts
    await expect(withdrawTx).to.be.reverted;

    // Additional check: user balance should still be recorded as 2 wei (since withdrawal failed)
    const finalBalance = await instance.getBalance(user.address);
    expect(finalBalance).to.equal(2n); // confirms mutant behavior
  });
});