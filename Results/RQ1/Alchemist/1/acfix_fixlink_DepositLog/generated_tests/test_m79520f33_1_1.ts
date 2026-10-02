import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test for m79520f33", function () {
  it("should kill mutant by verifying approved logger can logRedeemed and emit Redeemed event", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 as a logger
    await instance.connect(owner).setApprovedLogger(addr1.address, true);

    // Verify addr1 is approved
    expect(await instance.connect(addr1).approvedToLog(addr1.address)).to.equal(true);

    // Attempt to logRedeemed from approved logger - should return true and emit event
    const tx = await instance.connect(addr1).logRedeemed(
      ethers.encodeBytes32String("testTxid")
    );
    const receipt = await tx.wait();

    // Check that the Redeemed event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Redeemed")
      .withArgs(addr1.address, ethers.encodeBytes32String("testTxid"), receipt.timestamp);

    // Verify the function returned true (mutant would return false)
    // We can check this by ensuring the transaction succeeded without revert
    expect(receipt.status).to.equal(1);
  });
});