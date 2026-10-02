import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m41c3b167", function () {
  it("should revert when v1=0 and v2>1 in enforceTolerance (detect != mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock DAO contract that returns needed values
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Set up a mock configurable contract that returns configured() = true
    const MockConfigurable = await ethers.getContractFactory("MockConfigurable");
    const mockConfigurable = await MockConfigurable.deploy();
    await mockConfigurable.waitForDeployment();

    // Enable enforcement for the mock configurable address
    await instance.connect(addr1).setEnforcement(true);

    // Call enforceTolerance with v1=0 and v2=2 (v2 > 1)
    // Original: if (v1 == 0) require(v2 <= 1, "FE1") -> should revert
    // Mutant: if (v1 != 0) -> skips check when v1=0, so no revert
    await expect(
      instance.connect(addr1).enforceTolerance(0, 2)
    ).to.be.revertedWith("FE1");
  });
});

// Helper contracts for testing
contract MockLimboDAO {
  function getFlashGoverner() external view returns (address) {
    return address(0);
  }

  function successfulProposal(address) external pure returns (bool) {
    return false;
  }

  function proposalConfig() external pure returns (uint256, uint256, address) {
    return (0, 0, address(0));
  }
}

contract MockConfigurable {
  function configured() external pure returns (bool) {
    return true;
  }
}