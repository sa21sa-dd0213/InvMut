import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant m04d5b3c8 - Deposit requires <= instead of >=", function () {
  it("should revert when depositing non-zero amount with zero balance (mutant kills)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy ACCURAL_DEPOSIT (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 1 wei (non-zero amount) when balance is 0
    // Original: require(balances[msg.sender] + msg.value >= balances[msg.sender]) passes
    // Mutant: require(balances[msg.sender] + msg.value <= balances[msg.sender]) fails because 0+1 <= 0 is false
    const tx = owner.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("0.000000000000000001") // 1 wei
    });

    await expect(tx).to.be.reverted;
  });
});