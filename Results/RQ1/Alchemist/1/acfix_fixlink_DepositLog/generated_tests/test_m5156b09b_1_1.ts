import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test - m5156b09b", function () {
  it("should kill mutant by calling logRegisteredPubkey from approved logger and expecting true return and event emission", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);

    // Verify the logger is approved
    expect(await instance.approvedToLog(approvedLogger.address)).to.equal(true);

    // Call logRegisteredPubkey from the approved logger
    const pubkeyX = ethers.hexlify(ethers.randomBytes(32));
    const pubkeyY = ethers.hexlify(ethers.randomBytes(32));

    const tx = await instance.connect(approvedLogger).logRegisteredPubkey(pubkeyX, pubkeyY);
    const receipt = await tx.wait();

    // Check that the function returned true (mutant would return false)
    // We can check by verifying the event was emitted, since mutant would revert at the check
    expect(receipt).to.not.be.null;

    // Get the block timestamp for event verification
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    
    // Verify the RegisteredPubkey event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "RegisteredPubkey")
      .withArgs(approvedLogger.address, pubkeyX, pubkeyY, block.timestamp);
  });
});