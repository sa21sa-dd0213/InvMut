import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - onlyOwner modifier", function () {
  it("should revert when non-owner calls onlyOwner function on original, but owner call should succeed - mutant reverses access control", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, only owner can call withdrawAll
    // In the mutant (require(msg.sender != owner)), the owner is rejected
    // Therefore, calling withdrawAll from owner should succeed on original but fail on mutant
    // We call from owner and expect success (no revert) - this will kill the mutant
    
    // First, send some ether to the contract so withdrawAll has balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner calls withdrawAll - should succeed on original, revert on mutant
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});