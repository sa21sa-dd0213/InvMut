import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m0f81f149", function () {
  it("should revert when calling Command from unauthorized address in original, but mutant allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so attacker can attempt to drain it
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Attacker tries to call Command with a simple data payload and some ETH
    const attackValue = ethers.parseEther("1");
    const dummyData = "0xdeadbeef";

    // In the original contract this should revert because attacker != Owner
    // In the mutant (which removes the require) this will succeed
    const attackerBalanceBefore = await ethers.provider.getBalance(attacker.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    const tx = instance.connect(attacker).Command(attacker.address, dummyData, { value: attackValue });

    // The mutant will let this succeed; the original would revert
    // We expect the transaction to succeed (kill the mutant) by checking that
    // the attacker can send ETH to themselves via the call
    await expect(tx).to.not.be.reverted;

    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // The contract should have lost the attackValue (sent back to attacker)
    // In original this would never execute because of revert
    expect(contractBalanceAfter).to.be.lessThan(contractBalanceBefore);
  });
});