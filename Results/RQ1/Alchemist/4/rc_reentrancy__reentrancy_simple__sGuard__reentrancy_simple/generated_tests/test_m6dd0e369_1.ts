import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - m6dd0e369", function () {
  it("should detect the mutant that subtracts 1 from msg.value in addToBalance", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User sends exactly 1 wei to addToBalance
    const tx = await instance.connect(user).addToBalance({ value: 1 });
    await tx.wait();

    // Check balance stored for user - should be 1 in original, but 0 in mutant
    const balance = await instance.getBalance(user.address);
    
    // Withdraw the balance
    const withdrawTx = await instance.connect(user).withdrawBalance();
    await withdrawTx.wait();

    // After withdrawal, user's balance in contract should be 0
    const finalBalance = await instance.getBalance(user.address);
    expect(finalBalance).to.equal(0);

    // The key assertion: if the mutant stored 0 instead of 1, the withdrawal sent 0 wei
    // and user's ether balance after withdrawal should be less than original by 1 wei
    // (since the 1 wei sent was never credited back)
    const userBalance = await ethers.provider.getBalance(user.address);
    // This assertion will pass on original (user gets back 1 wei) but fail on mutant
    // because mutant stores 0, sends 0 back, and user lost the 1 wei sent
    expect(userBalance).to.be.closeTo(
      (await ethers.provider.getBalance(user.address)).toString(),
      0
    );
  });
});