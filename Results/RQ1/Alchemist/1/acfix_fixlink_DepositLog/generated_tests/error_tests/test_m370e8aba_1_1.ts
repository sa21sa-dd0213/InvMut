import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test - m370e8aba", function () {
  it("should return false and NOT emit CourtesyCalled when unapproved caller calls logCourtesyCalled", async function () {
    const [owner, unapproved] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify unapproved caller is not approved
    expect(await instance.approvedLoggers(unapproved.address)).to.equal(false);

    // Call logCourtesyCalled from unapproved address - should return false and NOT emit event
    const tx = await instance.connect(unapproved).logCourtesyCalled();
    const receipt = await tx.wait();

    // Verify the function returned false (mutant would return true)
    // The return value is captured in the transaction response
    const result = await instance.connect(unapproved).callStatic.logCourtesyCalled();
    expect(result).to.equal(false);

    // Verify no CourtesyCalled event was emitted
    const events = receipt!.logs;
    const courtesyCalledEvent = events.find(
      (log: any) => log.topics[0] === ethers.id("CourtesyCalled(address,uint256)")
    );
    expect(courtesyCalledEvent).to.be.undefined;
  });
});