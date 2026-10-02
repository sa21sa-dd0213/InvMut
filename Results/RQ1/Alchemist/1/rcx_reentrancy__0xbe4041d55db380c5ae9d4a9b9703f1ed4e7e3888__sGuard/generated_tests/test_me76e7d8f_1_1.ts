import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - me76e7d8f", function () {
  it("should revert when trying to collect funds before unlock time with sufficient balance (original behavior)", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set minimum sum to 0 so balance check doesn't interfere
    await instance.SetMinSum(0);
    // Initialize the contract
    await instance.Initialized();

    // User puts 1 ETH with a lock time of 100 seconds
    const lockTime = 100;
    const putTx = await instance.connect(user).Put(lockTime, { value: ethers.parseEther("1") });
    await putTx.wait();

    // Attempt to collect 0.5 ETH before unlock time - should revert in original
    // Block timestamp is now, unlock time is now + 100 seconds
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});