import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m791fc1b8 - enforceTolerance exponentiation bug", function () {
  it("should revert when enforceTolerance is called with v1 > v2 and the difference is within tolerance due to exponentiation producing huge value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a minimal DAO mock that returns configured=true and successfulProposal=true
    const DAOMockFactory = await ethers.getContractFactory("LimboDAOLike");
    const daoMock = await DAOMockFactory.deploy();
    await daoMock.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await daoMock.getAddress());
    await instance.waitForDeployment();
    
    // Configure security parameters with changeTolerance = 50 (50%)
    // Need to be a successful proposal to call configureSecurityParameters
    // First set configured to true by calling endConfiguration
    // But we need the DAO to return successfulProposal=true for owner
    // Mock the DAO's successfulProposal function
    
    // Since we need a proper setup, let's deploy a mock that satisfies the requirements
    // Actually, let's use the DAO mock approach properly
    
    // For the test, we need to call enforceTolerance directly
    // The function requires enforceLimitsActive[msg.sender] = true and Configurable(msg.sender).configured() = true
    
    // Let's create a simple configurable contract that returns configured=true
    const ConfigurableMockFactory = await ethers.getContractFactory("Configurable");
    // We'll use a simpler approach - call setEnforcement to enable limits for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Now call enforceTolerance with v1=2, v2=1 (v1 > v2)
    // In original: (2-1)*100 = 100 < 50*2 = 100? No, 100 < 100 is false, so it would revert with "FE1"
    // In mutant: (2-1)**100 = 1**100 = 1 < 100? Yes, so it would pass - but wait, we need a case where original passes and mutant fails
    
    // Let's try v1=10, v2=9 with changeTolerance=50
    // Original: (10-9)*100 = 100 < 50*10 = 500? Yes, 100 < 500, so it passes
    // Mutant: (10-9)**100 = 1**100 = 1 < 500? Yes, also passes - not good
    
    // Need case where original passes but mutant fails
    // v1=5, v2=1 with changeTolerance=50
    // Original: (5-1)*100 = 400 < 50*5 = 250? No, 400 < 250 is false, so reverts
    // Mutant: (5-1)**100 = 4**100 = huge number < 250? No, also reverts
    
    // We need the exponentiation to make a PASSING case into a FAILING one
    // v1=2, v2=1 with changeTolerance=50
    // Original: (2-1)*100 = 100 < 50*2 = 100? No, 100 < 100 is false, reverts
    // Mutant: (2-1)**100 = 1 < 100? Yes, passes - opposite direction
    
    // Actually, we need: original passes (no revert), mutant fails (reverts)
    // v1=2, v2=1 with changeTolerance=60
    // Original: (2-1)*100 = 100 < 60*2 = 120? Yes, passes
    // Mutant: (2-1)**100 = 1 < 120? Yes, passes - both pass
    
    // v1=3, v2=2 with changeTolerance=50
    // Original: (3-2)*100 = 100 < 50*3 = 150? Yes, passes
    // Mutant: (3-2)**100 = 1 < 150? Yes, passes
    
    // The exponentiation makes the left side smaller for small differences (since 1**100 = 1)
    // But for larger differences, exponentiation makes it much larger
    // v1=4, v2=2 with changeTolerance=30
    // Original: (4-2)*100 = 200 < 30*4 = 120? No, reverts
    // Mutant: (4-2)**100 = 2**100 = 1.27e30 < 120? No, reverts
    
    // We need a case where the multiplication gives a value BELOW threshold (passes)
    // but exponentiation gives a value ABOVE threshold (fails)
    // That requires: (v1-v2)*100 < threshold AND (v1-v2)**100 >= threshold
    // For v1-v2 = 2: 200 < threshold and 2**100 >= threshold
    // threshold = changeTolerance * v1 / 100 (from require formula)
    // Actually the require is: ((v1 - v2) * 100) < security.changeTolerance * v1
    // So threshold = security.changeTolerance * v1
    
    // Let's try v1=5, v2=3 (diff=2), changeTolerance=45
    // Original: 200 < 45*5 = 225? Yes, passes
    // Mutant: 2**100 = 1.27e30 < 225? No, fails - THIS IS IT!
    
    // But we need to properly set up the contract to allow enforceTolerance to execute
    
    // Let's use a different approach - directly manipulate storage or use a mock
    
    // Actually, looking at the code again, enforceTolerance checks:
    // if (!enforceLimitsActive[msg.sender] || !Configurable(msg.sender).configured()) return;
    // So if enforceLimitsActive is false or the sender is not configured, it just returns without reverting
    
    // We need to make enforceLimitsActive[msg.sender] = true AND have Configurable(msg.sender).configured() return true
    // Since we can't easily mock this, let's use the owner to set enforcement and call endConfiguration
    
    // But endConfiguration sets configured=true for the FlashGovernanceArbiter itself
    // Configurable(msg.sender) checks if the caller is configured - we need a contract that implements configured()
    
    // Let's deploy a simple contract that returns configured=true
    const TestConfigurable = await ethers.getContractFactory(
      "contract TestConfigurable { function configured() external pure returns (bool) { return true; } }"
    );
    
    // Actually, let's just deploy the FlashGovernanceArbiter and use it differently
    // We can call enforceTolerance directly as the owner, but first set enforceLimitsActive
    
    // Set enforcement for the owner
    await instance.connect(owner).setEnforcement(true);
    
    // Now we need Configurable(owner).configured() to return true
    // Since owner is an EOA, this won't work - it will just return (skip the check)
    // Actually the check is: !Configurable(msg.sender).configured() 
    // If msg.sender is an EOA, this call will revert because EOAs don't have functions
    // So we need to call from a contract
    
    // Let's create a simple contract that calls enforceTolerance
    const CallerFactory = await ethers.getContractFactory(
      `contract TestCaller {
        FlashGovernanceArbiter arbiter;
        constructor(address _arbiter) { arbiter = FlashGovernanceArbiter(_arbiter); }
        function testEnforceTolerance(uint256 v1, uint256 v2) external view {
          arbiter.enforceTolerance(v1, v2);
        }
        function configured() external pure returns (bool) { return true; }
      }
      interface FlashGovernanceArbiter {
        function enforceTolerance(uint256 v1, uint256 v2) external view;
        function setEnforcement(bool enforce) external;
      }`
    );
    
    const caller = await CallerFactory.deploy(await instance.getAddress());
    await caller.waitForDeployment();
    
    // Set enforcement for the caller contract
    await instance.connect(await ethers.getSigner(await caller.getAddress())).setEnforcement(true);
    
    // Now set security.changeTolerance to 45
    // To do this, we need to call configureSecurityParameters with onlySuccessfulProposal modifier
    // This requires the DAO to return successfulProposal(sender) = true
    // Since we can't easily set this up, let's try a different approach
    
    // Actually, looking at the enforceTolerance code more carefully:
    // if (!enforceLimitsActive[msg.sender] || !Configurable(msg.sender).configured()) return;
    // If either condition is false, it just returns without reverting
    // So we need BOTH to be true for the require to execute
    
    // Let's just set security.changeTolerance directly via storage manipulation
    // The security struct is at storage slot 2 (0-indexed)
    // security = SecurityParameters({ epochSize, lastFlashGovernanceAct, maxGovernanceChangePerEpoch, changeTolerance })
    // changeTolerance is the 4th element, so at slot 2 offset 96 bytes (3 * 32)
    
    // Let's set it via ethers provider storage set
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x2", // storage slot 2
      "0x" + "00".repeat(31) + "2d" // changeTolerance = 45 (0x2d) at offset 96
    ]);
    
    // Now call enforceTolerance from the caller contract with v1=5, v2=3
    // Original: (5-3)*100 = 200 < 45*5 = 225? Yes, should NOT revert
    // Mutant: (5-3)**100 = 2**100 = huge number < 225? No, should revert
    
    // The original should pass (no revert), the mutant should revert
    await expect(caller.testEnforceTolerance(5, 3)).to.not.be.reverted;
  });
});