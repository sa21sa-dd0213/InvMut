import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - mcc648c58", function () {
  it("should detect mutant that adds 1 extra wei to balance on deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits exactly 1 wei
    const depositAmount = 1n;
    const tx = await user.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount,
      data: instance.interface.encodeFunctionData("addToBalance")
    });
    await tx.wait();

    // Check balance after deposit
    const balance = await instance.getBalance(user.address);
    
    // Original contract: balance should be 1
    // Mutant: balance will be 2 (msg.value + 1)
    expect(balance).to.equal(1n);
  });
});