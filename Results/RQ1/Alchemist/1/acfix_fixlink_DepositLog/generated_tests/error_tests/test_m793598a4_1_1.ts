import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test - m793598a4", function () {
  it("should return false when unauthorized caller tries logGotRedemptionSignature, but mutant returns true", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure unauthorized is NOT an approved logger
    expect(await instance.approvedLoggers(unauthorized.address)).to.be.false;

    // Call logGotRedemptionSignature from unauthorized address
    // In original: should return false (since check fails)
    // In mutant: will return true (since if(false) never triggers return false)
    const tx = await instance.connect(unauthorized).logGotRedemptionSignature(
      ethers.hexlify(ethers.randomBytes(32)), // _digest
      ethers.hexlify(ethers.randomBytes(32)), // _r
      ethers.hexlify(ethers.randomBytes(32))  // _s
    );

    const receipt = await tx.wait();
    
    // The mutant will emit the event (since no access control), 
    // but the original would not. We can check if the event was emitted.
    // For the mutant to be killed, we assert that the function should NOT have emitted
    // the GotRedemptionSignature event when called by unauthorized user.
    // In the original, no event would be emitted because function returns false early.
    const events = receipt.logs.filter(
      (log: any) => log.topics[0] === ethers.id("GotRedemptionSignature(address,bytes32,bytes32,bytes32,uint256)")
    );
    
    // The mutant incorrectly allows emission - so we assert no event was emitted
    // which will pass on original (no event) and fail on mutant (event emitted)
    expect(events.length).to.equal(0);
  });
});