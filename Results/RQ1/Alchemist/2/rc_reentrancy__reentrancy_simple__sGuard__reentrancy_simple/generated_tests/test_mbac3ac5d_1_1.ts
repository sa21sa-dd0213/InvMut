import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbac3ac5d test", function () {
  it("should detect that mutant adds 1 to msg.value causing insufficient balance on withdrawal", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Attacker deposits exactly 1 ether
    await instance.connect(attacker).addToBalance({ value: depositAmount });

    // Check recorded balance - mutant would record depositAmount + 1 wei
    const recordedBalance = await instance.getBalance(attacker.address);

    // In mutant, recordedBalance should be depositAmount + 1 wei
    // In original, recordedBalance should be exactly depositAmount
    // The withdrawal will try to send recordedBalance, but contract only has depositAmount
    // This should revert in the mutant due to insufficient balance
    await expect(
      instance.connect(attacker).withdrawBalance()
    ).to.be.reverted;

    // Verify the contract's Ether balance is as expected (only depositAmount)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(depositAmount);
  });
});