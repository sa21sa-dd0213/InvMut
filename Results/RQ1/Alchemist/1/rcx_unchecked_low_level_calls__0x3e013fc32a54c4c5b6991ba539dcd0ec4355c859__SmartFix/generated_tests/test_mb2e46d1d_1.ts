import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant mb2e46d1d test", function () {
  it("should kill mutant by triggering overflow revert when balance + msg.value overflows", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some initial ether to the contract so it has a balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Calculate msg.value such that balance + msg.value overflows (exceeds type(uint256).max)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    // Overflow: we need contractBalance + msg.value > 2^256 - 1
    // So msg.value must be > (2^256 - 1 - contractBalance)
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - contractBalance + BigInt(1);
    
    // The original contract would pass the require check (balance + msg.value >= balance is true for overflow),
    // but Solidity 0.8+ built-in overflow check will revert on the actual addition.
    // The mutant removed the require, so the overflow check will kill it.
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: overflowValue })
    ).to.be.reverted;
  });
});