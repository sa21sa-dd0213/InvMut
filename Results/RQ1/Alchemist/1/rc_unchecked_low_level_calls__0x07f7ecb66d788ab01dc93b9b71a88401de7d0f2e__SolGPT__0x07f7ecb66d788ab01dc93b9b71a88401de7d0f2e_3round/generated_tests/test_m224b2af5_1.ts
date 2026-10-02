import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m224b2af5 test", function () {
  it("should detect removal of require(_s) in donateToWhale by checking that donate reverts when whale is a contract that rejects ETH", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a contract that rejects ETH to serve as the whale
    const RejectingWhaleFactory = await ethers.getContractFactory("RejectingWhale");
    const rejectingWhale = await RejectingWhaleFactory.deploy();
    await rejectingWhale.waitForDeployment();
    
    // Deploy PoCGame with the rejecting whale address
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(await rejectingWhale.getAddress(), betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Try to donate - the call should succeed in the mutant (no revert) but fail in the original
    // In the original contract, the require(_s) would revert the transaction
    // In the mutant, the transaction would succeed (silent failure)
    const donateTx = await instance.connect(addr1).donate({ value: ethers.parseEther("0.1") });
    const receipt = await donateTx.wait();
    
    // Check that the totalDonated was NOT increased (should be 0 because the call failed silently in mutant)
    // This is a proxy to detect the mutant - in original, this test would revert before updating totalDonated
    // In mutant, it updates totalDonated despite the failed call
    // We check the event emission instead to be more precise
    const events = receipt.logs;
    const donateEvent = events.find(log => {
      try {
        const parsed = instance.interface.parseLog(log);
        return parsed && parsed.name === "Donate";
      } catch {
        return false;
      }
    });
    
    // In the original contract, the donate would revert, so we would never get here
    // In the mutant, the Donate event IS emitted even though the ETH transfer failed
    // Therefore, if we reach this point and the Donate event exists, it's the mutant
    // To properly kill the mutant, we need a different approach:
    // We expect the transaction to revert in the original, but succeed in the mutant
    
    // Reset and try again with expect to revert (original behavior)
    // For this test, we deploy again and check that the original would revert
    // Actually, let's test directly: the mutant will NOT revert, so we expect success
    // But we want to kill the mutant, so we need a test that fails on the mutant
    // The test should expect a revert (original behavior) - the mutant will pass (no revert) - thus the test "fails" on mutant
    // Actually, we want the test to pass on original and fail on mutant
    // So we set up the test to expect a revert (original behavior)
    
    // Re-deploy to test properly
    const instance2 = await Factory.deploy(await rejectingWhale.getAddress(), betLimit);
    await instance2.waitForDeployment();
    await instance2.connect(owner).OpenToThePublic();
    
    // This should revert in the original (require(_s) fails), but succeed in the mutant
    // So we expect revert - the mutant will NOT revert, making the test fail (killing the mutant)
    await expect(
      instance2.connect(addr1).donate({ value: ethers.parseEther("0.1") })
    ).to.be.reverted;
  });
});

// Helper contract that rejects ETH
contract RejectingWhale {
  receive() external payable {
    revert("ETH not accepted");
  }
}