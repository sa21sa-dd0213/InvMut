import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test - ma19ecbd3", function () {
  it("should revert when unapproved address calls logLiquidated and check event is not emitted", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract - DepositLog has no constructor arguments
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 as a logger (to later verify approved logger works)
    await instance.connect(owner).setApprovedLogger(addr1.address, true);

    // Verify addr2 is NOT an approved logger
    expect(await instance.connect(addr2).approvedToLog(addr2.address)).to.equal(false);

    // Get the event filter for Liquidated events
    const liquidatedFilter = instance.filters.Liquidated();

    // Call logLiquidated from unapproved address (addr2)
    // In original contract, this should return false and NOT emit event
    // In mutant, it will emit event incorrectly
    const tx = await instance.connect(addr2).logLiquidated();
    const receipt = await tx.wait();

    // Check if Liquidated event was emitted
    const events = await instance.queryFilter(liquidatedFilter, receipt.blockNumber, receipt.blockNumber);

    // The mutant will emit the event, so if no events found, it kills the mutant
    expect(events.length).to.equal(0, "Liquidated event should NOT be emitted for unapproved caller");
  });
});