import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant test - getAllowanceRemaining", function () {
  it("should detect mutant that changes <= to == in daily allowance replenishment check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    // Create a game item with daily allowance
    await instance.createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // finiteSupply = false
      true,   // transferable = true
      0,      // itemsRemaining (irrelevant since finiteSupply is false)
      ethers.parseEther("1"),
      10       // dailyAllowance = 10
    );

    // Set up allowance by calling getAllowanceRemaining to initialize the dailyAllowanceReplenishTime
    // First call should return the full daily allowance
    const initialAllowance = await instance.getAllowanceRemaining(addr1.address, 0);
    expect(initialAllowance).to.equal(10);

    // Fast forward time past the replenish time (1 day + 1 second)
    await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
    await ethers.provider.send("evm_mine");

    // Now the original would return 10 (full allowance replenished)
    // The mutant with == would return stale allowance (0 or whatever was remaining)
    const allowanceAfterTime = await instance.getAllowanceRemaining(addr1.address, 0);
    
    // If the mutant is present, this will fail because it returns stale allowance instead of 10
    expect(allowanceAfterTime).to.equal(10);
  });
});