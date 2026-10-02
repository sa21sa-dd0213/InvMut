import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test - mbc019a4e", function () {
  it("should detect mutant that subtracts 1 wei from deposited amount", async function () {
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

    // Check balance recorded in contract
    const recordedBalance = await instance.getBalance(user.address);
    
    // In original: recordedBalance should be 1 wei
    // In mutant: recordedBalance will be 0 wei (1 - 1 = 0)
    // This difference will cause the subsequent withdrawal to fail or behave differently
    
    // User tries to withdraw their recorded balance
    await expect(
      instance.connect(user).withdrawBalance()
    ).to.not.be.reverted;
    
    // After withdrawal, user's balance should be 0
    const finalBalance = await instance.getBalance(user.address);
    expect(finalBalance).to.equal(0n);
    
    // In the original contract, the user would have received 1 wei back
    // In the mutant, the user never actually got their deposit recorded,
    // so they received nothing while the contract still holds the 1 wei
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // In original: contractBalance should be 0 (all funds withdrawn)
    // In mutant: contractBalance should be 1 (funds stuck because balance was never recorded)
    expect(contractBalance).to.equal(0n);
  });
});