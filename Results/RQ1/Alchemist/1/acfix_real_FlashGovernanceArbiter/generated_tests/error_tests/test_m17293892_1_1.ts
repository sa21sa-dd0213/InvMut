import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m17293892 (|| -> &&)", function () {
  it("should kill mutant by calling enforceTolerance when enforceLimitsActive is true but contract is not configured", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the FlashGovernanceArbiter with a DAO address
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiterFactory.deploy(owner.address);
    await arbiter.waitForDeployment();

    // Deploy a simple contract that implements Configurable interface
    // We need a contract that has a configured() function returning false
    const MockConfigurableFactory = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurableFactory.deploy();
    await mockConfigurable.waitForDeployment();

    // First, set enforceLimitsActive to true for the mockConfigurable address
    // We can do this by calling setEnforcement from the mockConfigurable address
    await arbiter.connect(mockConfigurable).setEnforcement(true);

    // Verify that enforceLimitsActive is true for this address
    // This is a public mapping, we can check it directly
    // Note: enforceLimitsActive is not public, so we can't check it directly
    // But we know it's set because we just called setEnforcement

    // Now call enforceTolerance with equal values
    // In the original: if (!enforceLimitsActive[msg.sender] || !Configurable(msg.sender).configured()) return;
    // Since enforceLimitsActive is TRUE, the first condition is false
    // Since configured() returns false, the second condition is true
    // OR: false || true = true, so original returns early (no revert)
    // AND: false && true = false, so mutant does NOT return early
    // Mutant will proceed to the tolerance checks and may revert or behave differently
    
    // We expect this to succeed in the original (early return)
    // But in the mutant, it will proceed to the if/else logic
    // With v1 == v2, the function will not revert in either branch
    // So we need to call with different values to see the mutant fail
    
    // Let's call with v1 > v2 and v2 != 0 to trigger the first branch
    // In the mutant: ((v1 - v2) * 100) < security.changeTolerance * v1
    // security.changeTolerance is 0 by default, so this becomes:
    // ((v1 - v2) * 100) < 0, which is false, so it will revert with "FE1"
    // In the original: it returns early, so no revert

    // Call enforceTolerance with v1=200, v2=100 (v1 > v2)
    // Original: returns early (no revert)
    // Mutant: proceeds, ((200-100)*100) < 0*200 = 10000 < 0 = false, reverts with "FE1"
    await expect(
      arbiter.connect(mockConfigurable).enforceTolerance(200, 100)
    ).to.not.be.reverted;

    // The test passes on original (no revert) but would fail on mutant (reverts)
    // This kills the mutant because the mutant behaves differently
  });
});