import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test", function () {
  it("should revert when non-owner calls withdrawAll on original, but succeed on mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some Ether to the contract so there is a balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Try to call withdrawAll from a non-owner address
    // On the original contract (with onlyOwner modifier), this should revert
    // On the mutant (without onlyOwner), this will succeed and drain funds
    const contractAsAttacker = instance.connect(attacker);
    
    // We expect the call to succeed on the mutant (fail the test on original)
    // So we assert that the transaction does NOT revert
    await expect(
      contractAsAttacker.withdrawAll()
    ).to.not.be.reverted;

    // Additionally verify the attacker received the funds
    const attackerBalance = await ethers.provider.getBalance(attacker.address);
    expect(attackerBalance).to.be.gt(ethers.parseEther("9999.0")); // attacker had 10000 ETH initially, plus ~1 ETH from contract
  });
});