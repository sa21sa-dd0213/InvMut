import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - m5f208094 (division instead of subtraction)", function () {
  it("should detect mutant by testing Collect with non-divisible amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: initialize the contract and set MinSum to 1 wei
    await instance.SetMinSum(1);
    await instance.SetLogFile(ethers.ZeroAddress);
    await instance.Initialized();

    // addr1 deposits 10 wei with lock time 0
    await instance.connect(addr1).Put(0, { value: 10 });

    // Advance time past unlockTime (block.timestamp + 0 is already past)
    await ethers.provider.send("evm_mine");

    // Try to collect 3 wei (10 - 3 = 7 in original; 10 / 3 = 3 in mutant)
    const collectTx = instance.connect(addr1).Collect(3);
    
    // In the original contract this should succeed and leave balance = 7
    // In the mutant this would set balance to 10/3 = 3 (integer division)
    // We can detect the mutant by checking the balance after Collect
    await expect(collectTx).to.not.be.reverted;
    
    const acc = await instance.Acc(addr1.address);
    // Original: balance should be 7 (10 - 3)
    // Mutant: balance would be 3 (10 / 3)
    expect(acc.balance).to.equal(7);
  });
});