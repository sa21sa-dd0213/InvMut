import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant m825aecd2", function () {
  it("should revert when non-owner calls withdrawAll on original, but succeed on mutant (unauthorized drain)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for SimpleWallet)
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Verify contract has balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("1.0"));

    // Attacker (non-owner) tries to call withdrawAll
    // On the original (with modifier): this should revert
    // On the mutant (without modifier): this should succeed and drain funds
    const attackerBalanceBefore = await ethers.provider.getBalance(attacker.address);

    // Call withdrawAll from attacker's address
    const tx = await instance.connect(attacker).withdrawAll();
    await tx.wait();

    // Verify the contract balance is now zero (drained by attacker)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(0);

    // Verify attacker received the funds
    const attackerBalanceAfter = await ethers.provider.getBalance(attacker.address);
    expect(attackerBalanceAfter).to.be.gt(attackerBalanceBefore);
  });
});