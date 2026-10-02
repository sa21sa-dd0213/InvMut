import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m3e0e88c0 test", function () {
  it("should detect removal of BetLimitChanged event emission in AdjustBetAmounts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, ethers.parseEther("0.1"));
    await instance.waitForDeployment();

    // Set a new bet limit value
    const newBetLimit = ethers.parseEther("0.5");

    // Call AdjustBetAmounts and capture the transaction
    const tx = await instance.connect(owner).AdjustBetAmounts(newBetLimit);
    const receipt = await tx.wait();

    // Check that BetLimitChanged event was NOT emitted (mutant removes it)
    const event = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("BetLimitChanged(uint256)")
    );
    expect(event).to.be.undefined;
  });
});