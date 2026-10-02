import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m0806eee6 - remove onlyOwner from withdraw", function () {
  it("should revert when non-owner calls withdraw, but mutant allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdraw has balance to pull
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Attempt withdraw from attacker (non-owner)
    // In the original, this should revert due to onlyOwner modifier
    // In the mutant, the modifier is removed, so it will succeed
    const attackerBalanceBefore = await ethers.provider.getBalance(attacker.address);
    
    await expect(
      instance.connect(attacker).withdraw(ethers.parseEther("0.5"))
    ).to.not.be.reverted;

    const attackerBalanceAfter = await ethers.provider.getBalance(attacker.address);
    
    // The mutant allows the withdrawal, so attacker's balance increases
    expect(attackerBalanceAfter).to.be.gt(attackerBalanceBefore);
  });
});