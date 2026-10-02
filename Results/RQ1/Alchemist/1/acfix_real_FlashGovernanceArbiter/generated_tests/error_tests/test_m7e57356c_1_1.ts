import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection - enforceTolerance", function () {
  it("should kill mutant m7e57356c by detecting inverted tolerance check when v1 > v2 and v2 != 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with a DAO address (can be any address for testing)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Deploy a simple configurable contract that returns configured() = true
    const ConfigurableFactory = await ethers.getContractFactory("SimpleConfigurable");
    const configurable = await ConfigurableFactory.deploy();
    await configurable.waitForDeployment();

    // Set enforceLimitsActive for the configurable contract
    await instance.setEnforcement(true);

    // Set the DAO to owner so we can call configureSecurityParameters
    await instance.setDAO(owner.address);

    // Now owner can call configureSecurityParameters since it's the DAO
    // and assertSuccessfulProposal will pass because configured is false
    await instance.configureSecurityParameters(
      10,    // maxGovernanceChangePerEpoch
      100,   // epochSize
      10     // changeTolerance = 10%
    );

    // Deploy the helper contract
    const HelperFactory = await ethers.getContractFactory("EnforceToleranceHelper");
    const helper = await HelperFactory.deploy();
    await helper.waitForDeployment();

    // Test case: v1 = 200, v2 = 190 (v1 > v2, v2 != 0)
    // Difference = 10, (v1 - v2) * 100 = 1000
    // changeTolerance * v1 = 10 * 200 = 2000
    // Original: 1000 < 2000 -> true (should pass)
    // Mutant: 1000 > 2000 -> false (should revert with "FE1")
    await expect(
      helper.callEnforceTolerance(instance.target, 200, 190)
    ).to.not.be.reverted;

    // Test case where difference is greater than tolerance
    // v1 = 200, v2 = 150 (difference = 50)
    // (v1 - v2) * 100 = 5000
    // changeTolerance * v1 = 2000
    // Original: 5000 < 2000 -> false (should revert with "FE1")
    // Mutant: 5000 > 2000 -> true (should pass)
    await expect(
      helper.callEnforceTolerance(instance.target, 200, 150)
    ).to.be.revertedWith("FE1");
  });
});

// Helper contracts to enable testing
contract SimpleConfigurable {
  function configured() public view returns (bool) {
    return true;
  }
}

contract EnforceToleranceHelper {
  function callEnforceTolerance(address arbiter, uint256 v1, uint256 v2) external view {
    FlashGovernanceArbiter(arbiter).enforceTolerance(v1, v2);
  }
}

interface FlashGovernanceArbiter {
  function enforceTolerance(uint256 v1, uint256 v2) external view;
}