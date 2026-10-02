import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m66eeecdd", function () {
  it("should revert when non-owner calls withdrawAll (mutant removed onlyOwner modifier)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so there's balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attacker attempts to call withdrawAll - should revert in original, but mutant allows it
    // We expect revert for the original behavior
    await expect(
      instance.connect(attacker).withdrawAll()
    ).to.be.reverted;

    // Verify the contract still has its balance (attacker couldn't steal it)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("1.0"));
  });
});